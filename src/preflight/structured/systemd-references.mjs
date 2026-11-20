export default function validateSystemdReferences(file, text, files) {
  const errors = [];
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const command = line
      .trim()
      .match(/^Exec(?:Start|StartPre|StartPost|Reload)=\s*(?:\+|-|!|@|:|\|)*([^\s]+)/u);
    const reference = command?.[1].match(/^\/eliware\/core[^/]*\/(.+)$/u);
    if (!reference) continue;
    const target = reference[1];
    if (!files.includes(target))
      errors.push(`FAIL ${file}:${index + 1}: referenced ${target} file is missing.`);
  }
  return errors;
}
