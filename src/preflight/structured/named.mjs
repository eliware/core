import isBalanced from "./balanced.mjs";
import readRepositoryFile from "../../preflight-config/read-repository-file.mjs";

const systemManagedIncludes = new Set([
  "/etc/crypto-policies/back-ends/bind.config",
  "/etc/named.root.key",
]);

export default function validateNamed(file, text, files, root, readFile, realPath) {
  const errors = [];
  if (!isBalanced(text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "")))
    errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  for (const match of text.matchAll(/\b(file|include)\s+"([^"]+)"\s*;/giu)) {
    const [, directive, reference] = match;
    if (directive.toLowerCase() === "include" && systemManagedIncludes.has(reference)) continue;
    const local = resolveNamedReference(directive.toLowerCase(), reference);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} file is missing.`);
    else if (local) {
      try {
        readRepositoryFile(root, local, readFile, realPath);
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
