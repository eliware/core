import parseInstances from "../../pair/keepalived/instances.mjs";
import validateDeclaredScripts from "./declared-scripts.mjs";
import validateNotificationScripts from "./notification-scripts.mjs";
import validateTrackedScripts from "./tracked-scripts.mjs";

export default function validateKeepalivedScripts(file, text, files) {
  const errors = validateDeclaredScripts(file, text, files);
  for (const [, instance] of parseInstances(text) ?? []) {
    errors.push(...validateNotificationScripts(file, instance.validationBody, files));
    errors.push(...validateTrackedScripts(file, instance.validationBody, text));
  }
  return errors;
}
