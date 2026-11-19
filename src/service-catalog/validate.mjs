const serviceUnitPattern = /^[a-zA-Z0-9_.@-]+\.service$/u;
const idPattern = /^[a-z][a-z0-9-]*$/u;

function hasKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}

function validConfigPath(path) {
  if (typeof path !== "string" || !path || path.includes("\\") || path.startsWith("/"))
    return false;
  const literal = path.endsWith("/**") ? path.slice(0, -3) : path;
  return (
    literal.length > 0 &&
    !literal.includes("*") &&
    !literal.split("/").some((part) => !part || part === "." || part === "..")
  );
}

export default function validateServiceCatalog(value) {
  const errors = [];
  if (!hasKeys(value, ["version", "components"]))
    return ["catalog must contain only version and components"];
  if (value.version !== 1) errors.push("catalog version must be 1");
  if (!Array.isArray(value.components) || value.components.length === 0) {
    errors.push("catalog must define at least one component");
    return errors;
  }
  const ids = new Set();
  value.components.forEach((component, index) => {
    const prefix = `components[${index}]`;
    if (!hasKeys(component, ["id", "name", "configPaths", "health", "action"])) {
      errors.push(`${prefix} contains unsupported fields or is not an object`);
      return;
    }
    if (typeof component.id !== "string" || !idPattern.test(component.id))
      errors.push(`${prefix}.id must use lowercase letters, numbers, and hyphens`);
    else if (ids.has(component.id)) errors.push(`${prefix}.id must be unique`);
    else ids.add(component.id);
    if (typeof component.name !== "string" || !component.name.trim())
      errors.push(`${prefix}.name must be a non-empty string`);
    if (
      !Array.isArray(component.configPaths) ||
      component.configPaths.length === 0 ||
      component.configPaths.some((path) => !validConfigPath(path))
    ) {
      errors.push(`${prefix}.configPaths must contain safe relative paths or directory patterns`);
    }
    if (!hasKeys(component.health, ["type", "unit"]) || component.health.type !== "systemd")
      errors.push(`${prefix}.health must define a systemd unit`);
    else if (
      typeof component.health.unit !== "string" ||
      !serviceUnitPattern.test(component.health.unit)
    )
      errors.push(`${prefix}.health.unit must be a systemd service unit`);
    if (
      !hasKeys(component.action, ["type", "operation", "unit"]) ||
      component.action.type !== "systemd"
    )
      errors.push(`${prefix}.action must define a systemd operation`);
    else {
      if (!new Set(["reload", "restart"]).has(component.action.operation))
        errors.push(`${prefix}.action.operation must be reload or restart`);
      if (
        typeof component.action.unit !== "string" ||
        !serviceUnitPattern.test(component.action.unit)
      )
        errors.push(`${prefix}.action.unit must be a systemd service unit`);
    }
  });
  return errors;
}
