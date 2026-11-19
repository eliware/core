import parseInstances from "../../pair/keepalived/instances.mjs";

export default function validateKeepalivedScripts(file, text, files) {
  const errors = [];
  validateDeclaredScriptPaths(file, text, files, errors);
  for (const [, instance] of parseInstances(text) ?? []) {
    validateScriptPaths(file, instance.validationBody, files, errors);
    validateTrackedScripts(file, instance.validationBody, text, errors);
  }
  return errors;
}

function validateDeclaredScriptPaths(file, text, files, errors) {
  for (const path of textScripts(text)) {
    const local = resolveLocalScript(path);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} script is missing.`);
  }
}

function validateScriptPaths(file, body, files, errors) {
  const paths = [...body.matchAll(/\bnotify(?:_master|_backup|_fault|_stop)?\s+([^\s{}]+)/gu)].map(
    (match) => match[1],
  );
  for (const path of paths) {
    const local = resolveLocalScript(path);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} script is missing.`);
  }
}

function validateTrackedScripts(file, body, text, errors) {
  for (const track of body.matchAll(/\btrack_script\s*\{([^{}]*)\}/gu)) {
    const names = track[1]
      .split(/\r?\n/u)
      .map((line) => line.trim().split(/\s+/u)[0])
      .filter(Boolean);
    for (const name of names) {
      if (!new RegExp(`\\bvrrp_script\\s+${escapeRegExp(name)}\\s*\\{`, "u").test(text))
        errors.push(`FAIL ${file}: tracked script ${name} is not defined.`);
    }
  }
}

function textScripts(body) {
  const scripts = [];
  for (const [, , contents] of body.matchAll(/\bvrrp_script\s+(\S+)\s*\{([^{}]*?)\}/gu)) {
    const script = contents.match(/\bscript\s+([^\s{}]+)/u)?.[1];
    if (script) scripts.push(script.replace(/^['"]|['"]$/gu, ""));
  }
  return scripts;
}

function resolveLocalScript(path) {
  const managed = path.match(/^\/eliware\/[^/]+\/(.+)$/u)?.[1];
  if (managed) return managed;
  if (path.startsWith("/etc/keepalived/")) return `etc/keepalived/${path.split("/").at(-1)}`;
  return undefined;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
