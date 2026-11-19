export default function findAffectedComponents(catalog, files) {
  if (!catalog) return [];
  const changed = new Set(files);
  if (changed.has("core-catalog.yaml")) return catalog.components;
  return catalog.components.filter((component) =>
    component.configPaths.some((pattern) => {
      if (pattern.endsWith("/**")) {
        const directory = pattern.slice(0, -3);
        return [...changed].some((file) => file.startsWith(`${directory}/`));
      }
      return changed.has(pattern);
    }),
  );
}
