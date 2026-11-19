import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import parseServiceCatalog from "./parse.mjs";

export default function loadServiceCatalog(root, readFile = readFileSync) {
  if (!root) return null;
  let source;
  try {
    source = readFile(resolve(root, "core-catalog.yaml"), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  const result = parseServiceCatalog(source);
  if (result.error) throw new Error(result.error);
  return result.value;
}
