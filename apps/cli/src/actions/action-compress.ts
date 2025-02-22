import { CommanderError } from "commander";
import fs from "fs/promises";
import mime from "mime";
import path from "path";
import sharp from "sharp";

import { Resolution } from "../lib/constants.js";
import {
  addFilenamePrefix,
  getAvailablePathname,
  getDirectory,
  getFilename,
  getFolderFiles,
  normalizeFilename,
  removeFilenamePrefix,
  replaceFilenameExtension,
} from "../lib/utils/index.js";
import { check_dependencies, ffmpeg_video_compress } from "../lib/bash.js";

export const FileType = ["image", "video"] as const;
type FileType = (typeof FileType)[number];

const unsupportedFormats: { [key in FileType]: string[] } = {
  image: ["image/webp", "image/gif", "image/svg+xml"],
  video: [],
};

const compressedFlagPrefix = "compressed_" as const;
const compressTempPrefix = "temp." as const;

export type CompressFileArgs = {
  verbose: number;
  type: FileType;
  resolution: Resolution;
  force: boolean;
  horizontal: boolean;
};

export async function file(
  pathname: string,
  { verbose, type, resolution, force, horizontal }: CompressFileArgs
) {
  await check_dependencies(["ffmpeg"]);

  if (force) console.warn("⚠️ Ignoring already compressed files");
  if (horizontal) console.warn("⚠️ Forcing horizontal aspect ratio 16x9");

  let verbose_title = "";

  const filePathList = await getFolderFiles(pathname, true);

  for (let filePath of filePathList) {
    const mimetype = mime.getType(filePath);
    if (!mimetype) continue;
    const fileType = mimetype.split("/")[0] as FileType;
    if (
      !(type ? [type] : FileType).includes(fileType as FileType) ||
      (unsupportedFormats[fileType] || []).includes(mimetype) ||
      (!force &&
        [compressedFlagPrefix, compressTempPrefix].some((pf) =>
          getFilename(filePath).startsWith(pf)
        ))
    )
      continue;

    const title = filePath
      .substring(pathname.length)
      .split("/")
      .slice(1, 1 + verbose)
      .join("/");

    if (title !== verbose_title)
      console.log(`Compressing ${fileType} at:`, title);

    verbose_title = title;

    try {
      if (fileType === "image") await compressImage(filePath);
      else if (fileType === "video")
        await compressVideo(filePath, resolution, horizontal);
    } catch (err) {
      console.error("    Error compressing", `"${filePath}"`);
      // console.error("Error compressing", `"${filePath}"`, err.message);
    }
  }

  console.log("\nCompression successfully finished 🚀");
}

async function compressImage(filePath: string) {
  await sharp(filePath)
    .webp()
    .toFile(replaceFilenameExtension(filePath, "webp"));
  await fs.rm(filePath);
}

async function compressVideo(
  filePath: string,
  resolution: Resolution,
  force?: boolean
) {
  const directory = getDirectory(filePath);
  let filename = getFilename(filePath);
  const normalizedFilename = normalizeFilename(filename);

  if (filename !== normalizedFilename) {
    const oldPathname = path.join(directory, filename);
    const newPathname = await getAvailablePathname(
      path.join(directory, normalizedFilename)
    );

    if (!newPathname) {
      throw new CommanderError(
        1,
        "P003",
        "Could not find a new file destination"
      );
    }

    const newFilename = getFilename(newPathname);
    console.log(
      "    File renamed. From:",
      `'${filename.trim()}'`,
      "to:",
      `'${newFilename.trim()}'`
    );

    await fs.rename(oldPathname, newPathname);
    filename = newFilename;
  }

  const input = path.join(directory, filename);
  const output = addFilenamePrefix(input, compressTempPrefix);

  await ffmpeg_video_compress(input, output, resolution, force).catch(
    async (err) => {
      await fs.rm(output);
      throw err;
    }
  );

  await fs.rm(input);
  await fs.rename(
    output,
    addFilenamePrefix(
      removeFilenamePrefix(input, compressedFlagPrefix),
      compressedFlagPrefix
    )
  );
}
