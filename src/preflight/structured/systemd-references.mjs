export default function validateSystemdReferences(file, text, files) {
  const errors = [];
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const command = line
      .trim()
      .match(/^Exec(?:Start|StartPre|StartPost|Reload)=\s*(?:\+|-|!|@|:|\|)*([^\s]+)/u);
    if (!command?.[1].startsWith("/eliware/core")) continue;
    const target = command[1].replace(/^\/eliware\/core[12]\//u, "");
    if (!files.includes(target))
      errors.push(`FAIL ${file}:${index + 1}: referenced ${target} file is missing.`);
  }
  return errors;
}
