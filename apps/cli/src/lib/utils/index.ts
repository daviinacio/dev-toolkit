import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

type FolderContent = { folder_list: Array<string>; file_list: Array<string> };

export async function getFolderFiles(
  pathname: string,
  recursive = false
): Promise<Array<string>> {
  const list = await fs.readdir(pathname);

  let { folder_list, file_list } = await list.reduce(async (_acc, name) => {
    const acc = await _acc;
    const is_directory = (
      await fs.lstat(path.join(pathname, name))
    ).isDirectory();

    if (is_directory) acc.folder_list.push(name);
    else acc.file_list.push(name);

    return acc;
  }, Promise.resolve({ folder_list: [], file_list: [] } as FolderContent));

  file_list = file_list.map((name) => path.join(pathname, name));

  if (!recursive) return file_list;

  const subfolder_file_list = await Promise.all(
    folder_list.map((folder_name) =>
      getFolderFiles(path.join(pathname, folder_name), recursive)
    )
  ).then((l) => l.flatMap((l) => l));

  file_list.push(...subfolder_file_list);

  return file_list;
}

export async function getFolderList(pathname: string) {
  return Promise.all(
    (await fs.readdir(pathname)).map(async (name) => {
      const is_directory = (
        await fs.lstat(path.join(pathname, name))
      ).isDirectory();
      return { name, is_directory };
    })
  ).then((result) =>
    result.filter((it) => it.is_directory).map((it) => it.name)
  );
}

export function getFilenameExtension(filename: string) {
  return (
    (filename.includes(".") && filename.split(".").slice(-1)[0]) || undefined
  );
}

export function replaceFilenameExtension(
  filename: string,
  newExtension: string
) {
  return `${getFilenameWithoutExtension(filename)}.${newExtension}`;
}

export function addFilenameSuffix(pathname: string, suffix: string) {
  const directory = getDirectory(pathname);
  const filename = getFilename(pathname);
  const extension = getFilenameExtension(filename);
  const filenameWithoutExtension = getFilenameWithoutExtension(filename);
  return path.join(
    directory,
    `${filenameWithoutExtension}${suffix}.${extension}`
  );
}

export function addFilenamePrefix(pathname: string, prefix: string) {
  const directory = getDirectory(pathname);
  const filename = getFilename(pathname);
  return path.join(directory, `${prefix}${filename}`);
}

export function removeFilenamePrefix(pathname: string, prefix: string) {
  const directory = getDirectory(pathname);
  const filename = getFilename(pathname);
  if (!filename.startsWith(prefix)) return pathname;
  return path.join(directory, filename.substring(prefix.length));
}

export function getFilenameWithoutExtension(filename: string) {
  return (
    (filename.includes(".") && filename.split(".").slice(0, -1).join(".")) ||
    filename
  );
}

export async function getAvailablePathname(pathname: string) {
  for (let i = 0; i < Number.MAX_SAFE_INTEGER; i++) {
    const availablePathname =
      i === 0 ? pathname : addFilenameSuffix(pathname, ` (${i})`);
    if (!fsSync.existsSync(availablePathname)) return availablePathname;
  }

  return null;
}

export function getFilename(pathname: string) {
  return pathname.split("/").slice(-1)[0];
}

export function getDirectory(pathname: string) {
  return pathname.split("/").slice(0, -1).join("/");
}

export function normalizeFilename(filename: string) {
  return (
    filename
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Avoid multiple characters
      .replace(/[ ]{2,}/g, " ")
      .replace(/[.]{2,}/g, ".")
      .replace(/[-]{2,}/g, "-")
      // Replace ' - ' to '-'
      .replace(/[ ][-][ ]/g, "-")
      .replace(/[-][ ]/g, "-")
      .replace(/[ ][-]/g, "-")
      // Replace space to '_'
      .replace(/[ ]/g, "_")
      // Remove all not allowed characters
      .replace(/[^-.0-9_a-zA-Z[]]/g, "")
      // Remove all not alphanumeric characters on start
      .replace(/^[^0-9a-zA-Z]/g, "")
  );
}
