import { parse } from "yaml";
import validateServiceCatalog from "./validate.mjs";

export default function parseServiceCatalog(source, file = "core-catalog.yaml") {
  let value;
  try {
    value = parse(source);
  } catch (error) {
    return { error: `${file}: ${error.message}` };
  }
  const errors = validateServiceCatalog(value);
  return errors.length
    ? { error: errors.map((error) => `${file}: ${error}`).join("; ") }
    : { value };
}
