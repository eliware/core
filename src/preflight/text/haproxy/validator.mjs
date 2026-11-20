import validateDirectives from "./directive-validator.mjs";

export default function validateHaproxy(file, { sections: parsedSections }) {
  const errors = [];
  const sections = new Map();
  const references = [];
  for (const section of parsedSections) {
    const { kind, name, line, directives } = section;
    const sectionName = name || kind;
    const key = `${kind}:${sectionName}`;
    if (["frontend", "backend", "listen"].includes(kind) && !name)
      errors.push(`FAIL ${file}:${line}: ${kind} needs a name.`);
    if (sections.has(key)) errors.push(`FAIL ${file}:${line}: duplicate ${kind} ${sectionName}.`);
    const result = validateDirectives(file, kind, directives);
    errors.push(...result.errors);
    references.push(...result.references);
    sections.set(key, { bound: result.bound, serverCount: result.serverCount });
  }
  if (!sections.has("global:global") || !sections.has("defaults:defaults"))
    errors.push(`FAIL ${file}: global and defaults sections are required.`);
  for (const [key, state] of sections) {
    if (key.startsWith("frontend:") && !state.bound)
      errors.push(`FAIL ${file}: ${key.slice(9)} needs a bind directive.`);
    if (key.startsWith("backend:") && state.serverCount === 0)
      errors.push(`FAIL ${file}: ${key.slice(8)} needs a server directive.`);
  }
  for (const backend of references)
    if (!sections.has(`backend:${backend}`) && !sections.has(`listen:${backend}`))
      errors.push(`FAIL ${file}: backend ${backend} is not defined.`);
  return errors;
}
