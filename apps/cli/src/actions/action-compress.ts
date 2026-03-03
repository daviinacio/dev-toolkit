import { CommanderError } from "commander";
import fs from "fs/promises";
import mime from "mime";
import path from "path";

import { Resolution } from "../lib/constants.js";
import {
  addFilenamePrefix,
  addFilenameSuffix,
  getAvailablePathname,
  getDirectory,
  getFilename,
  getFolderFiles,
  normalizeFilename,
  removeFilenamePrefix,
  replaceFilenameExtension,
} from "../lib/utils/index.js";
import {
  check_dependencies,
  ffmpeg_image_to_webp,
  ffmpeg_compress_mp4_gpu,
} from "../lib/bash.js";

export const FileType = ["image", "video"] as const;
type FileType = (typeof FileType)[number];

const unsupportedFormats: { [key in FileType]: string[] } = {
  image: ["image/webp", "image/gif", "image/svg+xml"],
  video: ["video/webm"],
};

const COMPRESSED_FLAG_SUFFIX = ".compressed" as const;

export type CompressFileArgs = {
  verbose: number;
  type: FileType;
  resolution: Resolution;
  force: boolean;
  horizontal: boolean;
};

export async function file(
  pathname: string,
  { verbose, type, resolution, force, horizontal }: CompressFileArgs,
) {
  await check_dependencies(["ffmpeg"]);

  if (force) console.warn("⚠️ Ignoring already compressed files");
  if (horizontal) console.warn("⚠️ Forcing horizontal aspect ratio 16x9");

  // let verbose_title = "";

  const filePathList = await getFolderFiles(pathname, true);

  for (let filePath of filePathList) {
    const mimetype = mime.getType(filePath);
    if (!mimetype) continue;
    const fileType = mimetype.split("/")[0] as FileType;
    if (
      !(type ? [type] : FileType).includes(fileType as FileType) ||
      (unsupportedFormats[fileType] || []).includes(mimetype) ||
      filePath.includes(COMPRESSED_FLAG_SUFFIX)
    )
      continue;

    const title = filePath
      .substring(pathname.length)
      .split("/")
      .slice(1, 1 + verbose)
      .join("/");

    // if (title !== verbose_title)
    //   console.log(`Compressing ${fileType} at:`, title);

    // verbose_title = title;

    try {
      if (fileType === "image") await compressImage(filePath);
      else if (fileType === "video")
        await compressVideo(filePath, resolution, horizontal);
    } catch (err) {
      if (verbose > 10) console.error("    Error compressing", err);
      else console.error("    Error compressing", `"${filePath}"`);
    }
  }

  console.log("\nCompression successfully finished 🚀");
}

async function compressImage(filePath: string) {
  await ffmpeg_image_to_webp(
    filePath,
    replaceFilenameExtension(filePath, "webp"),
  );
  await fs.rm(filePath);
}

async function compressVideo(
  filePath: string,
  resolution: Resolution,
  force?: boolean,
) {
  await ffmpeg_compress_mp4_gpu(
    filePath,
    addFilenameSuffix(filePath, COMPRESSED_FLAG_SUFFIX),
    resolution,
    force,
  );
  await fs.rm(filePath);
}
