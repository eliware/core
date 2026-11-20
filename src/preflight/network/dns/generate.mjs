import isValidDnsName from "./records/name.mjs";
import validateAddressRecord from "./records/address.mjs";
import validateTargetRecord from "./records/targets.mjs";
import validateTextRecord from "./records/text.mjs";

const recordTypes = new Set(["SOA", "NS", "A", "AAAA", "PTR", "CNAME", "MX", "TXT", "SRV", "CAA"]);

export default function isValidGenerate(tokens) {
  const range = tokens[1]?.match(/^(\d+)-(\d+)(?:\/(\d+))?$/u);
  if (!range || Number(range[2]) < Number(range[1]) || Number(range[3] ?? 1) < 1) return false;
  if (!isValidGeneratedName(tokens[2])) return false;
  const typeIndex = tokens.findIndex(
    (token, index) => index > 2 && recordTypes.has(token.toUpperCase()),
  );
  if (typeIndex < 3 || typeIndex - 3 > 2 || tokens.length <= typeIndex + 1) return false;
  let hasTtl = false;
  let hasClass = false;
  for (const value of tokens.slice(3, typeIndex)) {
    if (isDnsTtl(value) && !hasTtl) hasTtl = true;
    else if (["IN", "CH", "HS"].includes(value.toUpperCase()) && !hasClass) hasClass = true;
    else return false;
  }
  const type = tokens[typeIndex].toUpperCase();
  if (type === "SOA") return false;
  const fields = tokens.slice(typeIndex + 1).map(expandGenerateField);
  return (
    !validateTargetRecord(type, fields) &&
    !validateAddressRecord(type, fields) &&
    !validateTextRecord(type, fields)
  );
}

function isValidGeneratedName(value) {
  if (!value) return false;
  const expanded = expandGenerateField(value);
  return !expanded.includes("$") && isValidDnsName(expanded);
}

function expandGenerateField(value) {
  return value.replace(/\$\{[+-]?\d+(?:,\d+(?:,[doxXn])?)?\}|\$/gu, "1");
}

function isDnsTtl(value) {
  return /^(?:\d+[wdhms]?)+$/iu.test(value);
}
