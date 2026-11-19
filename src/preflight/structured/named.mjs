import isBalanced from "./balanced.mjs";
import validateNamedReferences from "./named-references.mjs";

export default function validateNamed(file, text, files, root, readFile, realPath) {
  const errors = [];
  if (!isBalanced(text.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/[^\n]*/gu, "")))
    errors.push(`FAIL ${file}: configuration blocks are not balanced.`);
  errors.push(...validateNamedReferences(file, text, files, root, readFile, realPath));
  if (file === "etc/named.conf" && !/\boptions\s*\{/u.test(text))
    errors.push(`FAIL ${file}: options block is missing.`);
  return errors;
}
