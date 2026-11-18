import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import listRepositoryFiles from "./repo-files.mjs";
import parseConfigFile from "./config-parser.mjs";
import validateConfigFiles from "./preflight-config.mjs";

export default async function preflight(
  root,
  {
    collectFiles = listRepositoryFiles,
    readFile = readFileSync,
    run = spawnSync,
    nodePath = process.execPath,
    platform = process.platform,
    configValidator = validateConfigFiles,
  } = {},
) {
  const lines = [];
  const errors = [];
  const inventory = collectFiles(root);
  if (inventory.error) return { ok: false, lines: [`FAIL ${inventory.error}`] };

  let packageJson;
  const supported = [];
  for (const file of inventory.files) {
    if (!isParseableConfig(file)) continue;
    try {
      const result = parseConfigFile(file, readFile(resolve(root, file), "utf8"));
      if (result.error) errors.push(`FAIL ${file}: ${result.error}.`);
      else supported.push(file);
      if (file === "package.json" && !result.error) packageJson = result.value;
    } catch {
      errors.push(`FAIL ${file}: could not read or parse the file.`);
    }
  }

  if (!packageJson || !inventory.files.includes("package-lock.json")) {
    errors.push("FAIL package.json or package-lock.json is missing.");
  } else {
    try {
      const lock = JSON.parse(readFile(resolve(root, "package-lock.json"), "utf8"));
      if (
        lock.name !== packageJson.name ||
        lock.version !== packageJson.version ||
        lock.packages?.[""]?.name !== packageJson.name ||
        lock.packages?.[""]?.version !== packageJson.version
      ) {
        errors.push("FAIL package.json and package-lock.json names or versions do not match.");
      }
    } catch {
      errors.push("FAIL package-lock.json is not valid JSON.");
    }
  }

  const format = run(
    platform === "win32" ? "cmd.exe" : "npm",
    platform === "win32" ? ["/d", "/s", "/c", "npm run format:check"] : ["run", "format:check"],
    { cwd: root, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
  );
  if (format.error || format.status !== 0) errors.push("FAIL repository formatting check.");
  else lines.push("PASS repository formatting");

  let javascriptCount = 0;
  for (const file of inventory.files.filter((item) => item.endsWith(".mjs"))) {
    const check = run(nodePath, ["--check", resolve(root, file)], {
      cwd: root,
      encoding: "utf8",
    });
    if (check.error || check.status !== 0) errors.push(`FAIL JavaScript syntax: ${file}.`);
    else javascriptCount += 1;
  }

  const configuration = configValidator(root, inventory.files, {
    readFile,
    repositoryName: packageJson?.name,
  });
  lines.push(...configuration.lines);
  errors.push(...configuration.errors);
  if (javascriptCount > 0) lines.push(`PASS JavaScript syntax (${javascriptCount} files)`);
  if (supported.length > 0)
    lines.push(`PASS parsed JSON, JSONC, and YAML (${supported.length} files)`);
  lines.push(...errors);
  return { ok: errors.length === 0, lines };
}

function isParseableConfig(file) {
  return (
    file === "package.json" ||
    file === "package-lock.json" ||
    file.endsWith(".yaml") ||
    file.endsWith(".yml") ||
    file.endsWith(".json") ||
    file.endsWith(".jsonc") ||
    (/^etc\/kea\/.+\.conf$/u.test(file) && file.endsWith(".conf"))
  );
}
