import { realpathSync, readFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

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
  try {
    resolvedRoot = realPath(rootPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return readFile(filePath, "utf8");
  }
  const parts = relative(rootPath, filePath).split(sep).filter(Boolean);
  let candidate = rootPath;
  try {
    for (const part of parts) {
      candidate = join(candidate, part);
      assertWithin(resolvedRoot, realPath(candidate));
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return readFile(filePath, "utf8");
  }
  return readFile(filePath, "utf8");
}

function assertWithin(root, file) {
  const path = relative(root, file);
  if (path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path))
    throw new Error("Referenced file is outside the configuration repository.");
}
