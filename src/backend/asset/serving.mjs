import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import readAsset from "./reader.mjs";

export default async function readRouteAsset(
  route,
  { publicRoot, buildRoot, read = readFile, resolvePath = realpath },
) {
  if (route === null) return null;

  const roots = { public: publicRoot, build: buildRoot };
  const root = roots[route?.root];
  if (typeof root !== "string" || typeof route.file !== "string")
    throw new TypeError("asset route must include a configured root and file");

  const assetRoot = resolve(root);
  const assetPath = resolve(assetRoot, route.file);
  const relativePath = relative(assetRoot, assetPath);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new RangeError("asset path must stay within its configured root");
  }

  try {
    const [realRoot, realAsset] = await Promise.all([
      resolvePath(assetRoot),
      resolvePath(assetPath),
    ]);
    const realRelativePath = relative(realRoot, realAsset);
    if (
      realRelativePath === ".." ||
      realRelativePath.startsWith(`..${sep}`) ||
      isAbsolute(realRelativePath)
    ) {
      throw new RangeError("asset path must stay within its configured root");
    }
    return await readAsset(realAsset, read);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}
