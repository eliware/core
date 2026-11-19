import { isIP } from "node:net";
import validateDnsDirective from "./directives.mjs";

const recordTypes = new Set(["SOA", "NS", "A", "AAAA", "PTR", "CNAME", "MX", "TXT", "SRV", "CAA"]);

export default function validateDnsRecord(file, tokens, line) {
  const errors = [];
  if (tokens[0]?.startsWith("$")) {
    return { errors: validateDnsDirective(file, tokens, line), type: null };
  }
  let typeIndex = 1;
  for (let count = 0; count < 2; count += 1) {
    if (
      /^\d+$/u.test(tokens[typeIndex] ?? "") ||
      ["IN", "CH", "HS"].includes(tokens[typeIndex]?.toUpperCase())
    )
      typeIndex += 1;
    else break;
  }
  if (!recordTypes.has(tokens[typeIndex]?.toUpperCase())) typeIndex = -1;
  const type = tokens[typeIndex]?.toUpperCase();
  if (typeIndex < 0 || !validDnsName(tokens[0])) {
    errors.push(`FAIL ${file}:${line}: invalid DNS record.`);
    return { errors, type: null };
  }
  const fields = tokens.slice(typeIndex + 1);
  const name = (value) => validDnsName(value);
  const integer = (value, max) => /^\d+$/u.test(value ?? "") && Number(value) <= max;
  if (type === "SOA") {
    const timers = fields.slice(2);
    if (
      fields.length !== 7 ||
      !name(fields[0]) ||
      !name(fields[1]) ||
      timers.length !== 5 ||
      timers.some((timer) => !/^\d+$/u.test(timer))
    )
      errors.push(`FAIL ${file}:${line}: SOA record needs valid names and five numeric timers.`);
  } else if (type === "NS" && (fields.length !== 1 || !name(fields[0])))
    errors.push(`FAIL ${file}:${line}: NS record has an invalid target name.`);
  else if (
    ["A", "AAAA"].includes(type) &&
    (fields.length !== 1 || isIP(fields[0]) !== (type === "A" ? 4 : 6))
  )
    errors.push(`FAIL ${file}:${line}: ${type} record has an invalid address.`);
  else if (["PTR", "CNAME"].includes(type) && (fields.length !== 1 || !name(fields[0])))
    errors.push(`FAIL ${file}:${line}: ${type} record has an invalid target name.`);
  else if (type === "MX" && (fields.length !== 2 || !integer(fields[0], 65535) || !name(fields[1])))
    errors.push(`FAIL ${file}:${line}: MX record needs a valid preference and target name.`);
  else if (
    type === "SRV" &&
    (fields.length !== 4 ||
      fields.slice(0, 3).some((field) => !integer(field, 65535)) ||
      !name(fields[3]))
  )
    errors.push(`FAIL ${file}:${line}: SRV record needs three valid numbers and a target name.`);
  else if (
    type === "CAA" &&
    (fields.length !== 3 ||
      !integer(fields[0], 255) ||
      !/^[A-Za-z0-9-]+$/u.test(fields[1] ?? "") ||
      !fields[2])
  )
    errors.push(`FAIL ${file}:${line}: CAA record needs valid flags, a tag, and a value.`);
  else if (type === "TXT") {
    if (fields.some((field) => field.length === 0))
      errors.push(`FAIL ${file}:${line}: TXT record contains an empty value.`);
    else if (fields.some((field) => !/^"(?:[^"\\]|\\.)*"$/u.test(field)) || fields.length === 0)
      errors.push(`FAIL ${file}:${line}: TXT record values must be quoted strings.`);
  }
  return { errors, type };
}

function validDnsName(name) {
  return (
    name === "@" ||
    name === "." ||
    /^(?:[A-Za-z0-9_*-][A-Za-z0-9_*-]*\.)*[A-Za-z0-9_*-]+\.?$/u.test(name)
  );
}
