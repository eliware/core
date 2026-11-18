export default function parseHealthUnits(value = "") {
  const units = value
    .split(",")
    .map((unit) => unit.trim())
    .filter(Boolean);
  if (units.some((unit) => !/^[a-zA-Z0-9_.@-]+\.service$/u.test(unit)))
    throw new Error("CORE_HEALTH_UNITS must contain systemd service unit names.");
  return units;
}
