import parseConfigFile from "./config-parser.mjs";
import readRepositoryFile from "./preflight-config/read-repository-file.mjs";
import validateKea from "./preflight/kea.mjs";
import validateWireguard from "./preflight/wireguard.mjs";
import validateStructured from "./preflight/structured.mjs";
import validateNetwork from "./preflight/network.mjs";
import validateText from "./preflight/text.mjs";
import validateProfile from "./preflight-config/profile.mjs";
import isRouterFile from "./preflight-config/router-file.mjs";

export default function validateConfigFiles(
  root,
  files,
  { readFile, realPath, repositoryName } = {},
) {
  const errors = validateProfile(files, repositoryName);
  const routerFiles = files.filter(isRouterFile);
  for (const file of routerFiles) {
    let text;
    try {
      text = readRepositoryFile(root, file, readFile, realPath);
    } catch {
      errors.push(`FAIL ${file}: could not read the file.`);
      continue;
    }
    errors.push(...validateFile(file, text, files, readFile, realPath, root));
  }
  return {
    lines: [`PASS Node.js configuration checks (${routerFiles.length} files)`],
    errors,
  };
}

function validateFile(file, text, files, readFile, realPath, root) {
  const errors = [];
  const invalid = (message) => errors.push(`FAIL ${file}: ${message}.`);
  if (text.includes("\0")) invalid("file contains a null byte");
  if (/^etc\/kea\/.+\.conf$/u.test(file)) {
    const parsed = parseConfigFile(file, text);
    if (parsed.error) errors.push(`FAIL ${file}: ${parsed.error}.`);
    else
      errors.push(...validateKea(file, parsed.value).map((message) => `FAIL ${file}: ${message}.`));
  }
  if (file === "etc/wireguard/wg0.conf") errors.push(...validateWireguard(file, text));
  errors.push(...validateStructured(file, text, files, root, readFile, realPath));
  errors.push(...validateNetwork(file, text));
  errors.push(...validateText(file, text));
  return errors;
}
