import { spawnSync } from "node:child_process";
import { resolve, win32 } from "node:path";

export default function checkJavaScriptSyntax(
  root,
  files,
  { run = spawnSync, nodePath = process.execPath } = {},
) {
  let count = 0;
  const errors = [];
  for (const file of files.filter((item) => item.endsWith(".mjs"))) {
    const result = run(nodePath, ["--check", resolveFromRoot(root, file)], {
      cwd: root,
      encoding: "utf8",
    });
    if (result.error || result.status !== 0) errors.push(`FAIL JavaScript syntax: ${file}.`);
    else count += 1;
  }
  return { count, errors };
}

function resolveFromRoot(root, file) {
  return /^[A-Za-z]:[\\/]/u.test(root) ? win32.resolve(root, file) : resolve(root, file);
}
