import validateDirectives from "./directive-validator.mjs";
import validateSectionRules from "./section-rules.mjs";

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
  return [...errors, ...validateSectionRules(file, sections, references)];
}
