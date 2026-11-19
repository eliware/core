import selectComponents from "./component-selection.mjs";

export default async function checkCatalogStatus({ catalog, componentId, run }) {
  const selection = selectComponents(catalog, componentId);
  if (selection.error)
    return { ok: false, usageError: selection.usageError, lines: [selection.error] };
  const units = new Map();
  const lines = [];
  let ok = true;
  for (const component of selection.components) {
    const unit = component.health.unit;
    if (!units.has(unit)) {
      try {
        await run("systemctl", ["is-active", "--quiet", unit]);
        units.set(unit, true);
      } catch {
        units.set(unit, false);
      }
    }
    const healthy = units.get(unit);
    ok &&= healthy;
    lines.push(`${healthy ? "Healthy" : "Unhealthy"}: ${component.name} (${unit})`);
  }
  return { ok, lines };
}
