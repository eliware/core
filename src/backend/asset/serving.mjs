import { readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import readAsset from "./reader.mjs";
import assertAssetPathWithinRoot from "./path-policy.mjs";

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
  if (assetPath === assetRoot) return null;
  assertAssetPathWithinRoot(assetRoot, assetPath);

  try {
    const [realRoot, realAsset] = await Promise.all([
      resolvePath(assetRoot),
      resolvePath(assetPath),
    ]);
    assertAssetPathWithinRoot(realRoot, realAsset);
    return await readAsset(realAsset, read);
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}
