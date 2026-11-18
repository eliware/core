export default function parseHaproxy(file, text) {
  const errors = [];
  const sections = [];
  let current;
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const value = line.replace(/#.*$/u, "").trim();
    if (!value) continue;
    const heading = value.match(/^(global|defaults|frontend|backend|listen)\s*(.*)$/u);
    if (heading) {
      if (current) sections.push(current);
      current = { kind: heading[1], name: heading[2], line: index + 1, directives: [] };
    } else if (!current)
      errors.push(`FAIL ${file}:${index + 1}: setting appears before a section.`);
    else current.directives.push({ value, line: index + 1 });
  }
  if (current) sections.push(current);
  return { errors, sections };
}
