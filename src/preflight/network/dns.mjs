import tokenizeDnsRecord from "./dns/tokenize.mjs";
import validateDnsRecord from "./dns/records.mjs";

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
    const result = validateDnsRecord(file, tokens, index + 1);
    errors.push(...result.errors);
    if (result.type === "SOA") soa += 1;
    if (result.type === "NS") nameservers += 1;
  }
  if (parentheses !== 0 || pending)
    errors.push(`FAIL ${file}: record parentheses are not balanced.`);
  if (soa !== 1) errors.push(`FAIL ${file}: exactly one SOA record is required.`);
  if (nameservers < 1) errors.push(`FAIL ${file}: at least one NS record is required.`);
  return errors;
}
