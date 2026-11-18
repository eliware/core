import { isIP } from "node:net";
import tokenizeDnsRecord from "./dns/tokenize.mjs";

const recordTypes = new Set(["SOA", "NS", "A", "AAAA", "PTR", "CNAME", "MX", "TXT", "SRV", "CAA"]);

export default function validateDns(file, text) {
  const errors = [];
  const records = text
    .replace(/;[^\n]*/gu, "")
    .replace(/\r/g, "")
    .split("\n");
  let parentheses = 0;
  let soa = 0;
  let nameservers = 0;
  let pending = "";
  for (const [index, source] of records.entries()) {
    const line = source.trim();
    if (!line) continue;
    parentheses += (line.match(/\(/gu) ?? []).length - (line.match(/\)/gu) ?? []).length;
    pending += `${pending ? " " : ""}${line}`;
    if (parentheses > 0) continue;
    const tokens = tokenizeDnsRecord(pending);
    pending = "";
    if (tokens[0]?.startsWith("$")) {
      validateDirective(file, tokens, index + 1, errors);
      continue;
    }
    const typeIndex = tokens.findIndex((token) => recordTypes.has(token.toUpperCase()));
    const type = tokens[typeIndex]?.toUpperCase();
    if (typeIndex < 0 || tokens.length <= typeIndex + 1)
      errors.push(`FAIL ${file}:${index + 1}: invalid DNS record.`);
    else if (type === "SOA") {
      soa += 1;
      if (tokens.length < typeIndex + 8 || !/^\d+$/u.test(tokens.at(-1)))
        errors.push(`FAIL ${file}:${index + 1}: SOA record needs five numeric timers.`);
    } else if (type === "NS") {
      nameservers += 1;
      if (!validDnsName(tokens[typeIndex + 1]))
        errors.push(`FAIL ${file}:${index + 1}: NS record has an invalid target name.`);
    } else if (
      ["A", "AAAA"].includes(type) &&
      isIP(tokens[typeIndex + 1]) !== (type === "A" ? 4 : 6)
    )
      errors.push(`FAIL ${file}:${index + 1}: ${type} record has an invalid address.`);
    else if (["PTR", "CNAME"].includes(type) && !validDnsName(tokens[typeIndex + 1]))
      errors.push(`FAIL ${file}:${index + 1}: ${type} record has an invalid target name.`);
  }
  if (parentheses !== 0 || pending)
    errors.push(`FAIL ${file}: record parentheses are not balanced.`);
  if (soa !== 1) errors.push(`FAIL ${file}: exactly one SOA record is required.`);
  if (nameservers < 1) errors.push(`FAIL ${file}: at least one NS record is required.`);
  return errors;
}

function validateDirective(file, tokens, line, errors) {
  const [directive, ...args] = tokens;
  if (directive === "$ORIGIN" && args.length === 1 && validDnsName(args[0])) return;
  if (directive === "$TTL" && args.length === 1 && /^(?:\d+[wdhms]?)+$/iu.test(args[0])) return;
  if (
    directive === "$INCLUDE" &&
    (args.length === 1 || (args.length === 2 && validDnsName(args[1])))
  )
    return;
  if (directive === "$GENERATE") {
    const typeIndex = tokens.findIndex(
      (token, index) => index > 1 && recordTypes.has(token.toUpperCase()),
    );
    if (
      /^\d+(?:-\d+)?(?:\/\d+)?$/u.test(args[0] ?? "") &&
      typeIndex > 1 &&
      tokens.length > typeIndex + 1
    )
      return;
  }
  errors.push(`FAIL ${file}:${line}: invalid DNS directive ${directive}.`);
}

function validDnsName(name) {
  return (
    name === "@" ||
    name === "." ||
    /^(?:[A-Za-z0-9_*-][A-Za-z0-9_*-]*\.)*[A-Za-z0-9_*-]+\.?$/u.test(name)
  );
}
