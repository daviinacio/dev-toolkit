import { exec } from "child_process";
import { Resolution, resolutionMapping } from "./constants.js";
import { CommanderError } from "commander";

export const execAsync = (command: string) =>
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
      missing_dependencies.map((dep) => `'${dep}'`).join(", ")
    );
  }
}

export async function ffmpeg_video_compress(
  input: string,
  output: string,
  resolution: Resolution = "480p",
  forceResolution?: boolean
) {
  const { w, h } = resolutionMapping[resolution];

  return execAsync(
    forceResolution
      ? `ffmpeg -i "${input}" -s ${w}x${h} -acodec copy -y "${output}"`
      : `ffmpeg -i "${input}" -filter:v scale=-1:${h} -acodec copy -y "${output}"`
  );
}

export async function ffmpeg_image_to_webp(input: string, output: string) {
  return execAsync(`ffmpeg -i "${input}" -c:v libwebp "${output}"`);
}
