import { realpathSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export default function readRepositoryFile(
  root,
  file,
  readFile = readFileSync,
  realPath = realpathSync,
) {
  const rootPath = resolve(root);
  const filePath = resolve(rootPath, file);
  assertWithin(rootPath, filePath);
  let resolvedRoot;
  let resolvedFile;
  try {
    resolvedRoot = realPath(rootPath);
    resolvedFile = realPath(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return readFile(filePath, "utf8");
  }
  assertWithin(resolvedRoot, resolvedFile);
  return readFile(filePath, "utf8");
}

function assertWithin(root, file) {
  const path = relative(root, file);
  if (path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path))
    throw new Error("Referenced file is outside the configuration repository.");
}
