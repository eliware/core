export default function selectComponents(catalog, componentId) {
  if (!catalog) return { error: "No service catalog is configured." };
  const components = componentId
    ? catalog.components.filter((component) => component.id === componentId)
    : catalog.components;
  return components.length
    ? { components }
    : { error: `Unknown component: ${componentId}`, usageError: true };
}
