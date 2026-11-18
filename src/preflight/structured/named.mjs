import { resolve } from "node:path";
import isBalanced from "./balanced.mjs";

export default function validateNamed(file, text, files, root, readFile) {
  const errors = [];
  if (!isBalanced(text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "")))
    errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  for (const match of text.matchAll(/\b(file|include)\s+"([^"]+)"\s*;/giu)) {
    const [, directive, reference] = match;
    const local = resolveNamedReference(directive.toLowerCase(), reference);
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

function resolveNamedReference(directive, reference) {
  const managed = reference.match(/^\/eliware\/[^/]+\/(.+)$/u)?.[1];
  if (managed) return managed;
  const systemPath = reference.match(/^\/(etc|var|scripts)\/(.+)$/u);
  if (directive === "include" && systemPath) return `${systemPath[1]}/${systemPath[2]}`;
  if (reference.startsWith("zones/")) return `var/named/${reference}`;
  if (directive === "include" && !reference.startsWith("/"))
    return `etc/${reference.replace(/^\.\//u, "")}`;
  return undefined;
}
