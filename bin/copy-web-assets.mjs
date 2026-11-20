import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("../", import.meta.url));
for (const [source, target] of [
  ["client.js", "client.bundle"],
  ["service-worker.js", "service-worker.bundle"],
]) {
  await copyFile(resolve(packageRoot, "dist", source), resolve(packageRoot, "public", target));
}
