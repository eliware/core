export default function validateHaproxy(file, { sections, references }) {
  const errors = [];
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
