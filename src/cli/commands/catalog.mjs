import formatCliError from "../error-output.mjs";
import formatCatalogComponent from "../catalog-output.mjs";

export default function runCatalogCommand(cwd, catalogCommand) {
  let catalog;
  try {
    catalog = catalogCommand(cwd);
  } catch (error) {
    return { ok: false, lines: [formatCliError("catalog", error)] };
  }
  if (!catalog) return { ok: true, lines: ["No service catalog is configured."] };
  return { ok: true, lines: catalog.components.map(formatCatalogComponent) };
}
