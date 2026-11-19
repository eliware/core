export default function formatCliError(type, value) {
  if (type === "catalog") return `Catalog error: ${value.message}`;
  if (type === "invalid") return `Invalid arguments for ${value}.`;
  return `Unknown argument: ${value}`;
}
