import validateDnsDirective from "./directives.mjs";
import isValidDnsName from "./records/name.mjs";
import validateAddressRecord from "./records/address.mjs";
import validateTargetRecord from "./records/targets.mjs";
import validateTextRecord from "./records/text.mjs";

const recordTypes = new Set(["SOA", "NS", "A", "AAAA", "PTR", "CNAME", "MX", "TXT", "SRV", "CAA"]);

export default function validateDnsRecord(file, tokens, line) {
  const errors = [];
  if (tokens[0]?.startsWith("$")) {
    return { errors: validateDnsDirective(file, tokens, line), type: null };
  }
  let typeIndex = 1;
  for (let count = 0; count < 2; count += 1) {
    if (
      isDnsTtl(tokens[typeIndex]) ||
      ["IN", "CH", "HS"].includes(tokens[typeIndex]?.toUpperCase())
    )
      typeIndex += 1;
    else break;
  }
  if (!recordTypes.has(tokens[typeIndex]?.toUpperCase())) typeIndex = -1;
  const type = tokens[typeIndex]?.toUpperCase();
  if (typeIndex < 0 || !isValidDnsName(tokens[0])) {
    errors.push(`FAIL ${file}:${line}: invalid DNS record.`);
    return { errors, type: null };
  }
  const fields = tokens.slice(typeIndex + 1);
  const detail =
    validateTargetRecord(type, fields) ??
    validateAddressRecord(type, fields) ??
    validateTextRecord(type, fields);
  if (detail) errors.push(`FAIL ${file}:${line}: ${detail}.`);
  return { errors, type };
}

function isDnsTtl(value) {
  return /^(?:\d+[wdhms]?)+$/iu.test(value ?? "");
}
