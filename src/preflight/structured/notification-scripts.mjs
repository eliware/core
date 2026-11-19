function resolveLocalScript(path) {
  const managed = path.match(/^\/eliware\/[^/]+\/(.+)$/u)?.[1];
  if (managed) return managed;
  if (path.startsWith("/etc/keepalived/")) return `etc/keepalived/${path.split("/").at(-1)}`;
  return undefined;
}

export default function validateNotificationScripts(file, body, files) {
  const paths = [...body.matchAll(/\bnotify(?:_master|_backup|_fault|_stop)?\s+([^\s{}]+)/gu)].map(
    ([, path]) => path,
  );
  const errors = [];
  for (const path of paths) {
    const local = resolveLocalScript(path);
    if (local && !files.includes(local))
      errors.push(`FAIL ${file}: referenced ${local} script is missing.`);
  }
  return errors;
}
