import { realpathSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import assertPathWithin from "./path-policy.mjs";

export default function readRepositoryFile(
  root,
  file,
  readFile = readFileSync,
  realPath = realpathSync,
) {
  const rootPath = resolve(root);
  const filePath = resolve(rootPath, file);
  assertPathWithin(rootPath, filePath);
  let resolvedRoot;
  try {
    resolvedRoot = realPath(rootPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return readFile(filePath, "utf8");
  }
  const parts = relative(rootPath, filePath).split(sep).filter(Boolean);
  let candidate = resolvedRoot;
  try {
    for (const part of parts) {
      candidate = join(candidate, part);
      assertPathWithin(resolvedRoot, realPath(candidate));
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return readFile(filePath, "utf8");
  }
  return readFile(filePath, "utf8");
}
