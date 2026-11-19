import validateServiceCatalog from "../service-catalog/validate.mjs";
import findAffectedComponents from "../service-catalog/affected-components.mjs";

export default function validateRepositoryCatalog(file, catalog, files) {
  const errors = validateServiceCatalog(catalog);
  if (errors.length) return { errors: errors.map((error) => `FAIL ${file}: ${error}.`), lines: [] };
  const catalogErrors = files
    .filter((path) => /^(etc|var|scripts)\//u.test(path))
    .filter((path) => !findAffectedComponents(catalog, [path]).length)
    .map((path) => `FAIL ${file}: managed path ${path} is not mapped to a component.`);
  return {
    errors: catalogErrors,
    lines: [`PASS service catalog, entries: ${catalog.components.length}`],
  };
}
