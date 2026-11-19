import { isIP } from "node:net";
import validateDnsDirective from "./directives.mjs";

const recordTypes = new Set(["SOA", "NS", "A", "AAAA", "PTR", "CNAME", "MX", "TXT", "SRV", "CAA"]);

export default function validateDnsRecord(file, tokens, line) {
  const errors = [];
  if (tokens[0]?.startsWith("$")) {
    return { errors: validateDnsDirective(file, tokens, line), type: null };
  }
  let typeIndex = 1;
  if (/^\d+$/u.test(tokens[typeIndex] ?? "")) typeIndex += 1;
  if (["IN", "CH", "HS"].includes(tokens[typeIndex]?.toUpperCase())) typeIndex += 1;
  if (!recordTypes.has(tokens[typeIndex]?.toUpperCase())) typeIndex = -1;
  const type = tokens[typeIndex]?.toUpperCase();
  if (typeIndex < 0 || tokens.length <= typeIndex + 1) {
    errors.push(`FAIL ${file}:${line}: invalid DNS record.`);
    return { errors, type: null };
  }
  if (type === "SOA") {
    const timers = tokens.slice(typeIndex + 3, typeIndex + 8);
    if (
      tokens.length !== typeIndex + 8 ||
      timers.length !== 5 ||
      timers.some((timer) => !/^\d+$/u.test(timer))
    )
      errors.push(`FAIL ${file}:${line}: SOA record needs five numeric timers.`);
  } else if (type === "NS" && !validDnsName(tokens[typeIndex + 1]))
    errors.push(`FAIL ${file}:${line}: NS record has an invalid target name.`);
  else if (["A", "AAAA"].includes(type) && isIP(tokens[typeIndex + 1]) !== (type === "A" ? 4 : 6))
    errors.push(`FAIL ${file}:${line}: ${type} record has an invalid address.`);
  else if (["PTR", "CNAME"].includes(type) && !validDnsName(tokens[typeIndex + 1]))
    errors.push(`FAIL ${file}:${line}: ${type} record has an invalid target name.`);
  return { errors, type };
}

function validDnsName(name) {
  return (
    name === "@" ||
    name === "." ||
    /^(?:[A-Za-z0-9_*-][A-Za-z0-9_*-]*\.)*[A-Za-z0-9_*-]+\.?$/u.test(name)
  );
}
