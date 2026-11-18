import { parse as parseJsonc, printParseErrorCode } from "jsonc-parser";
import { parseDocument } from "yaml";

export default function parseConfigFile(path, text) {
  if (path.endsWith(".yaml") || path.endsWith(".yml")) {
    const document = parseDocument(text, { prettyErrors: false });
    return document.errors.length
      ? { error: "invalid YAML syntax" }
      : { value: document.toJS(), supported: true };
  }

  if (
    path.endsWith(".json") ||
    path.endsWith(".jsonc") ||
    (/^etc\/kea\/.+\.conf$/u.test(path) && path.endsWith(".conf"))
  ) {
    const errors = [];
    const value = parseJsonc(text, errors, { allowTrailingComma: true });
    if (errors.length > 0) {
      return { error: `invalid JSON syntax (${printParseErrorCode(errors[0].error)})` };
    }
    return { value, supported: true };
  }

  return { supported: false };
}
