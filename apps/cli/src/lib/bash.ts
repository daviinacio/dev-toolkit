import { exec } from "child_process";
import { Resolution, resolutionMapping } from "./constants.js";
import { CommanderError } from "commander";
import { promisify } from "util";
import * as os from "os";

export const execAsync = (command: string): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr));
      else resolve(stdout);
    });
  });

const globalDependencies = ["ffmpeg"];

async function check_dependency(dependency: string): Promise<boolean> {
  return execAsync(`${dependency} -h`)
    .then(() => true)
    .catch(() => false);
}

export async function check_dependencies(dependencies = globalDependencies) {
  const missing_dependencies = [];

  for (let dep of dependencies) {
    if (!(await check_dependency(dep))) missing_dependencies.push(dep);
  }

  if (missing_dependencies.length > 0) {
    throw new CommanderError(
      1,
      "missing_dependencies",
      missing_dependencies.map((dep) => `'${dep}'`).join(", "),
    );
  }
}

type GpuType = "nvidia" | "amd" | "intel" | "mac" | "cpu";

// Cache para não termos que detectar a GPU toda vez que formos comprimir um vídeo
let cachedGpuType: GpuType | null = null;

async function detectGPU(): Promise<GpuType> {
  if (cachedGpuType) return cachedGpuType;
  const platform = os.platform();

  try {
    if (platform === "darwin") return (cachedGpuType = "mac");

    let output = "";
    if (platform === "win32") {
      const stdout = await execAsync(
        "wmic path win32_VideoController get name",
      );
      output = stdout.toLowerCase();
    } else if (platform === "linux") {
      const stdout = await execAsync("lspci");
      output = stdout.toLowerCase();
    }

    if (output.includes("nvidia")) cachedGpuType = "nvidia";
    else if (output.includes("amd") || output.includes("radeon"))
      cachedGpuType = "amd";
    else if (output.includes("intel")) cachedGpuType = "intel";
    else cachedGpuType = "cpu";
  } catch (error) {
    cachedGpuType = "cpu";
  }
  return cachedGpuType;
}

export async function ffmpeg_video_to_webm(
  input: string,
  output: string, // O arquivo deve terminar em .webm
) {
  const gpu = await detectGPU();
  const isLinux = os.platform() === "linux";

  // 1. Mapeia os Encoders VP9 para usar as GPUs
  const encoders = {
    nvidia: "-c:v vp9_nvenc -preset p4",
    amd: isLinux ? "-c:v vp9_vaapi" : "-c:v vp9_amf",
    intel: isLinux ? "-c:v vp9_vaapi" : "-c:v vp9_qsv",
    mac: "-c:v libvpx-vp9 -row-mt 1 -cpu-used 4", // Fallback (Mac não expõe VP9 nativo no FFmpeg)
    cpu: "-c:v libvpx-vp9 -row-mt 1 -cpu-used 4",
  };

  const vcodec = encoders[gpu] || encoders.cpu;

  let hwaccel = "";
  let videoFilter = "";

  // 2. Lógica VA-API (Linux) para manter todo o fluxo de frames na GPU
  if (isLinux && (gpu === "amd" || gpu === "intel")) {
    // Estas flags transferem a decodificação para a GPU e mantêm os frames na memória de vídeo
    hwaccel =
      "-hwaccel vaapi -hwaccel_device /dev/dri/renderD128 -hwaccel_output_format vaapi";
    // Como não vamos mudar a resolução, o filtro apenas formata e sobe para a GPU caso o input não venha em formato compatível
    videoFilter = `-vf "format=nv12,hwupload"`;
  } else if (gpu === "nvidia" || gpu === "amd" || gpu === "intel") {
    hwaccel = "-hwaccel auto";
  }

  // 3. Áudio para WebM
  const acodec = "-c:a libopus -b:a 128k";

  // 4. Monta o comando (removido o -s e -filter:v de redimensionamento)
  const command = `ffmpeg ${hwaccel} -i "${input}" ${videoFilter ? videoFilter : ""} ${vcodec} ${acodec} -f webm -y "${output}"`;

  console.log(`Compressing video [${gpu}]:`, input);

  return execAsync(command);
}

// /**
//  * Detecta a GPU instalada na máquina rodando comandos nativos do SO.
//  */
// async function detectGPU(): Promise<GpuType> {
//   if (cachedGpuType) return cachedGpuType;
//   const platform = os.platform();

//   try {
//     if (platform === "darwin") return (cachedGpuType = "mac");

//     let output = "";
//     if (platform === "win32") {
//       const stdout = await execAsync(
//         "wmic path win32_VideoController get name",
//       );
//       output = stdout.toLowerCase();
//     } else if (platform === "linux") {
//       const stdout = await execAsync("lspci");
//       output = stdout.toLowerCase();
//     }

//     if (output.includes("nvidia")) cachedGpuType = "nvidia";
//     else if (output.includes("amd") || output.includes("radeon"))
//       cachedGpuType = "amd";
//     else if (output.includes("intel")) cachedGpuType = "intel";
//     else cachedGpuType = "cpu";
//   } catch (error) {
//     cachedGpuType = "cpu";
//   }
//   return cachedGpuType;
// }

// export async function ffmpeg_video_compress_webm(
//   input: string,
//   output: string,
//   resolution: Resolution = "480p",
//   forceResolution?: boolean,
// ) {
//   const { w, h } = resolutionMapping[resolution];
//   const gpu = await detectGPU();
//   const isLinux = os.platform() === "linux";

//   // 1. Mapeia os Encoders para o codec VP9
//   const encoders = {
//     nvidia: "-c:v vp9_nvenc -preset p4",
//     // Removemos o vp9_vaapi da AMD no Linux, caindo para a CPU (libvpx-vp9)
//     amd: isLinux ? "-c:v libvpx-vp9 -row-mt 1 -cpu-used 4" : "-c:v vp9_amf",
//     intel: isLinux ? "-c:v vp9_vaapi" : "-c:v vp9_qsv", // Intel costuma suportar melhor vp9_vaapi, mas pode dar o mesmo erro dependendo da geração
//     mac: "-c:v libvpx-vp9 -row-mt 1 -cpu-used 4",
//     cpu: "-c:v libvpx-vp9 -row-mt 1 -cpu-used 4",
//   };

//   const vcodec = encoders[gpu] || encoders.cpu;

//   // 2. Só ativamos o hwaccel se NÃO formos usar a CPU (libvpx-vp9)
//   // Como a AMD no Linux agora usa libvpx-vp9, ela entra na regra de desativar o hwaccel para encode
//   const isUsingCpuEncoder = vcodec.includes("libvpx");
//   let hwaccel = isUsingCpuEncoder ? "" : "-hwaccel auto";
//   let videoFilter = "";

//   // 3. Lógica específica VA-API (agora só ativada se a Intel for usar hardware)
//   if (isLinux && !isUsingCpuEncoder && gpu === "intel") {
//     hwaccel = "-vaapi_device /dev/dri/renderD128";
//     videoFilter = forceResolution
//       ? `-vf "scale=${w}:${h},format=nv12,hwupload"`
//       : `-vf "scale=-1:${h},format=nv12,hwupload"`;
//   } else {
//     // Escala normal via CPU (necessária para o libvpx-vp9)
//     videoFilter = forceResolution ? `-s ${w}x${h}` : `-filter:v scale=-1:${h}`;
//   }

//   // O vídeo WebM necessita de codecs de áudio específicos como o Opus
//   const acodec = "-c:a libopus -b:a 128k";

//   // A flag '-f webm' força explicitamente a criação de um contentor de vídeo WebM
//   const command = `ffmpeg ${hwaccel} -i "${input}" ${videoFilter} ${vcodec} ${acodec} -f webm -y "${output}"`;

//   return execAsync(command);
// }

/**
 * Comprime vídeo para MP4 (H.264) utilizando a GPU disponível com taxa de compressão otimizada.
 */
export async function ffmpeg_compress_mp4_gpu(
  input: string,
  output: string, // O arquivo deve terminar em .mp4
  resolution: Resolution = "480p",
  forceResolution?: boolean,
) {
  const { w, h } = resolutionMapping[resolution];
  const gpu = await detectGPU();
  const isLinux = os.platform() === "linux";

  // 1. Mapeia os Encoders H.264 com equivalência de compressão (Qualidade vs Tamanho)
  // O valor 28 é o "sweet spot". Menor = mais qualidade/mais pesado. Maior = menos qualidade/mais leve.
  const encoders = {
    nvidia: "-c:v h264_nvenc -preset p4 -cq 28",
    amd: isLinux ? "-c:v h264_vaapi -qp 28" : "-c:v h264_amf -qp_i 28 -qp_p 28",
    intel: isLinux
      ? "-c:v h264_vaapi -qp 28"
      : "-c:v h264_qsv -global_quality 28",
    mac: "-c:v h264_videotoolbox -q:v 60", // No Mac a escala é diferente, 60 é um bom balanço
    cpu: "-c:v libx264 -preset fast -crf 28",
  };

  const vcodec = encoders[gpu] || encoders.cpu;

  let hwaccel = gpu === "cpu" ? "" : "-hwaccel auto";
  let videoFilter = "";

  // 2. Define a string base do redimensionamento (Scale)
  const scaleStr = forceResolution ? `scale=${w}:${h}` : `scale=-1:${h}`;

  // 3. Aplica o filtro correto baseado na necessidade de VA-API no Linux
  if (isLinux && (gpu === "amd" || gpu === "intel")) {
    hwaccel = "-vaapi_device /dev/dri/renderD128";
    // Integra a resolução e o upload para a GPU no mesmo filtro
    videoFilter = `-vf "${scaleStr},format=nv12,hwupload"`;
  } else {
    // Para NVIDIA, Mac e Windows, o scale simples via software antes de subir pra GPU funciona melhor
    videoFilter = `-vf "${scaleStr}"`;
  }

  // 4. Áudio AAC universal e forçamento do container MP4
  const acodec = "-c:a aac -b:a 128k";
  const format = "-f mp4";

  // 5. Monta e executa o comando final
  const command = `ffmpeg ${hwaccel} -i "${input}" ${videoFilter} ${vcodec} ${acodec} ${format} -y "${output}"`;

  console.log(`Compressing video [${gpu}]:`, input);

  return execAsync(command);
}

export async function ffmpeg_image_to_webp(input: string, output: string) {
  console.log(`Compressing image:`, input);
  return execAsync(`ffmpeg -i "${input}" -c:v libwebp "${output}"`);
}
