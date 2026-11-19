import * as defaultFileSystem from "node:fs";
import { homedir, tmpdir, userInfo } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

export default function prepareLockDirectory(options = {}) {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const userId = options.userId === null ? undefined : (options.userId ?? process.getuid?.());
  const userName = options.userName ?? userInfo().username;
  const temporaryDirectory = options.tempDirectory ?? tmpdir();
  const directory =
    options.directory ??
    join(temporaryDirectory, `eliware-core-locks-${userId ?? safePathSegment(userName)}`);
  if (!options.directory)
    ensurePrivateDirectory(directory, fileSystem, userId, {
      homeDirectory: options.homeDirectory ?? homedir(),
      temporaryDirectory,
    });
  return directory;
}

function ensurePrivateDirectory(
  directory,
  fileSystem,
  userId,
  { homeDirectory, temporaryDirectory },
) {
  try {
    fileSystem.mkdirSync(directory, { mode: 0o700 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const info = fileSystem.lstatSync(directory);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw new Error("Deployment lock directory must be a real directory.");
  if (userId !== undefined && (info.uid !== userId || (info.mode & 0o077) !== 0))
    throw new Error("Deployment lock directory must be private to the application user.");
  if (userId === undefined) {
    const relativeTemporaryDirectory = relative(
      resolve(homeDirectory),
      resolve(temporaryDirectory),
    );
    if (
      relativeTemporaryDirectory === ".." ||
      relativeTemporaryDirectory.startsWith(`..${sep}`) ||
      isAbsolute(relativeTemporaryDirectory)
    )
      throw new Error("Deployment lock directory must be private to the application user.");
  }
}

function safePathSegment(value) {
  return String(value).replace(/[^A-Za-z0-9._-]/gu, "_") || "user";
}
