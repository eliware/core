import isValidGenerate from "./generate.mjs";

export default function validateDnsDirective(file, tokens, line) {
  const [directive, ...args] = tokens;
  if (directive === "$ORIGIN" && args.length === 1 && validDnsName(args[0])) return [];
  if (directive === "$TTL" && args.length === 1 && /^(?:\d+[wdhms]?)+$/iu.test(args[0])) return [];
  if (directive === "$INCLUDE" && isValidInclude(args)) return [];
  if (directive === "$GENERATE" && isValidGenerate(tokens)) return [];
  return [`FAIL ${file}:${line}: invalid DNS directive ${directive}.`];
}

function isValidInclude(args) {
  const filename = args[0] ?? "";
  const pathIsValid = filename
    .split("/")
    .every((part) => part !== "." && part !== ".." && /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/u.test(part));
  return (args.length === 1 || (args.length === 2 && validDnsName(args[1]))) && pathIsValid;
}

function validDnsName(name) {
  return (
    name === "@" ||
    name === "." ||
    /^(?:[A-Za-z0-9_*-][A-Za-z0-9_*-]*\.)*[A-Za-z0-9_*-]+\.?$/u.test(name)
  );
}
