function resolveLocalScript(path) {
  const managed = path.match(/^\/eliware\/[^/]+\/(.+)$/u)?.[1];
  if (managed) return managed;
  if (path.startsWith("/etc/keepalived/")) return `etc/keepalived/${path.split("/").at(-1)}`;
  return undefined;
}

export default function validateDeclaredScripts(file, text, files) {
  const paths = [...text.matchAll(/\bvrrp_script\s+\S+\s*\{([^{}]*?)\}/gu)]
    .map(([, body]) => body.match(/\bscript\s+([^\s{}]+)/u)?.[1])
    .filter(Boolean);
  const errors = [];
  for (const path of paths) {
    const local = resolveLocalScript(path.replace(/^['"]|['"]$/gu, ""));
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} script is missing.`);
  }
  return errors;
}
