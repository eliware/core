import listCatalogActions from "../service-catalog/actions.mjs";
import selectComponents from "./component-selection.mjs";

export default async function reloadCatalogComponents({ catalog, componentId, run }) {
  const selection = selectComponents(catalog, componentId);
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
