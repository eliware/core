export default function listCatalogActions(components) {
  const seen = new Set();
  return components.flatMap(({ action }) => {
    const key = `${action.operation}:${action.unit}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [action];
  });
}
