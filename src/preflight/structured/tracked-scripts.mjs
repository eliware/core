function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export default function validateTrackedScripts(file, body, text) {
  const errors = [];
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
  return errors;
}
