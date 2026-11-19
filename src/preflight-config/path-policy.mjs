import { isAbsolute, relative, sep } from "node:path";

export default function assertPathWithin(root, file) {
  const path = relative(root, file);
  if (path === ".." || path.startsWith(`..${sep}`) || isAbsolute(path))
    throw new Error("Referenced file is outside the configuration repository.");
}
