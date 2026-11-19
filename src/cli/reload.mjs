import listCatalogActions from "../service-catalog/actions.mjs";

function chooseComponents(catalog, componentId) {
  if (!catalog) return { error: "No service catalog is configured." };
  const components = componentId
    ? catalog.components.filter((component) => component.id === componentId)
    : catalog.components;
  return components.length
    ? { components }
    : { error: `Unknown component: ${componentId}`, usageError: true };
}

export default async function reloadCatalogComponents({ catalog, componentId, run }) {
  const selection = chooseComponents(catalog, componentId);
  if (selection.error)
    return { ok: false, usageError: selection.usageError, lines: [selection.error] };
  const actions = listCatalogActions(selection.components);
  const lines = [];
  for (const action of actions) {
    try {
      await run("systemctl", [action.operation, action.unit]);
      lines.push(`Completed: ${action.operation} ${action.unit}`);
    } catch {
      lines.push(`Failed: ${action.operation} ${action.unit}`);
      return { ok: false, lines };
    }
  }
  return { ok: true, lines };
}
