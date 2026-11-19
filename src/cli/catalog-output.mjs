export default function formatCatalogComponent(component) {
  return `${component.id} — ${component.name} | paths: ${component.configPaths.join(", ")} | health: ${component.health.unit} | action: ${component.action.operation} ${component.action.unit}`;
}
