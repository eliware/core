import validateSystemdReferences from "./systemd-references.mjs";

export default function validateSystemd(file, text, files) {
  const errors = [];
  const sections = new Set();
  let section = "";
  const seen = new Set();
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const value = line.trim();
    if (!value || value.startsWith("#") || value.startsWith(";")) continue;
    const heading = value.match(/^\[([A-Za-z]+)\]$/u);
    if (heading) {
      section = heading[1];
      sections.add(section);
      continue;
    }
    const setting = value.match(/^([A-Za-z][A-Za-z0-9]+)\s*=/u);
    if (!section || !setting)
      errors.push(`FAIL ${file}:${index + 1}: expected a section or key-value setting.`);
    else {
      const key = `${section}:${setting[1]}`;
      if (
        seen.has(key) &&
        ![
          "ExecStartPre",
          "ExecStartPost",
          "ExecReload",
          "Environment",
          "EnvironmentFile",
          "After",
          "Wants",
          "Requires",
          "Before",
          "PartOf",
          "WantedBy",
        ].includes(setting[1])
      )
        errors.push(`FAIL ${file}:${index + 1}: duplicate ${setting[1]} setting.`);
      seen.add(key);
    }
  }
  errors.push(...validateSystemdReferences(file, text, files));
  if (file.includes(".d/")) {
    if (sections.size === 0) errors.push(`FAIL ${file}: a drop-in needs a unit section.`);
  } else if (!sections.has("Unit") || (!sections.has("Service") && !sections.has("Timer"))) {
    errors.push(`FAIL ${file}: a unit needs [Unit] and [Service] or [Timer] sections.`);
  }
  return errors;
}
