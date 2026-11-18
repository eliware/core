import { resolve } from "node:path";
import isBalanced from "./balanced.mjs";

export default function validateNamed(file, text, files, root, readFile) {
  const errors = [];
  if (!isBalanced(text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "")))
    errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  for (const match of text.matchAll(/\bfile\s+"([^"]+)"\s*;/gu)) {
    const reference = match[1];
    const local =
      reference.match(/^\/eliware\/core[12]\/(.+)$/u)?.[1] ??
      (reference.startsWith("zones/") ? `var/named/${reference}` : undefined);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} file is missing.`);
    else if (local) {
      try {
        readFile(resolve(root, local), "utf8");
      } catch {
        errors.push(`FAIL ${file}: referenced ${local} file cannot be read.`);
      }
    }
  }
  if (file === "etc/named.conf" && !/\boptions\s*\{/u.test(text))
    errors.push(`FAIL ${file}: options block is missing.`);
  return errors;
}
