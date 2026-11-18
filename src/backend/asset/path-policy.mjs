import { isAbsolute, relative, sep } from "node:path";

export default function assertAssetPathWithinRoot(root, target) {
  const path = relative(root, target);
  if (path === "" || path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path)) {
    throw new RangeError("asset path must stay within its configured root");
  }
}
