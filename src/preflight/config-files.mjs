export default function isParseableConfig(file) {
  return (
    file === "package.json" ||
    file === "package-lock.json" ||
    file.endsWith(".yaml") ||
    file.endsWith(".yml") ||
    file.endsWith(".json") ||
    file.endsWith(".jsonc") ||
    (/^etc\/kea\/.+\.conf$/u.test(file) && file.endsWith(".conf"))
  );
}
