import { open, realpath, stat } from "node:fs/promises";
import assertAssetPathWithinRoot from "./path-policy.mjs";

export default async function readAsset(
  { assetRoot, assetPath, realAsset },
  { openFile = open, resolvePath = realpath, statPath = stat },
) {
  let handle;
  try {
    handle = await openFile(realAsset, "r");
    const openedFile = await handle.stat();
    const [currentAsset, currentPath] = await Promise.all([
      resolvePath(assetPath),
      statPath(realAsset),
    ]);
    assertAssetPathWithinRoot(assetRoot, currentAsset);
    if (openedFile.dev !== currentPath.dev || openedFile.ino !== currentPath.ino)
      throw new Error("asset changed while it was being read");
    return await handle.readFile();
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  } finally {
    await handle?.close();
  }
}
