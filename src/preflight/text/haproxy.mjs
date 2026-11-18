import parseHaproxy from "./haproxy/parser.mjs";
import validateHaproxy from "./haproxy/validator.mjs";

export default function checkHaproxy(file, text) {
  const parsed = parseHaproxy(file, text);
  return [...parsed.errors, ...validateHaproxy(file, parsed)];
}
