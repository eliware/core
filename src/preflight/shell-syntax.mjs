import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, win32 } from "node:path";

export default function checkShellSyntax(
  root,
  files,
  { run = spawnSync, readFile = readFileSync } = {},
) {
  let count = 0;
  const errors = [];
  for (const file of files.filter((item) => item.endsWith(".sh"))) {
    let script;
    try {
      script = readFile(resolveFromRoot(root, file), "utf8");
    } catch {
      errors.push(`FAIL Bash syntax: ${file}.`);
      continue;
    }
    const result = run("bash", ["-n"], { cwd: root, encoding: "utf8", input: script });
    if (result.error || result.status !== 0) errors.push(`FAIL Bash syntax: ${file}.`);
    else count += 1;
  }
  return { count, errors };
}

function resolveFromRoot(root, file) {
  return /^[A-Za-z]:[\\/]/u.test(root) ? win32.resolve(root, file) : resolve(root, file);
}
