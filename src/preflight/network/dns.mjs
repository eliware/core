import tokenizeDnsRecord from "./dns/tokenize.mjs";
import validateDnsRecord from "./dns/records.mjs";

export default function validateDns(file, text) {
  const errors = [];
  const records = text.replace(/\r/g, "").split("\n");
  let parentheses = 0;
  let soa = 0;
  let nameservers = 0;
  let pending = "";
  let pendingOwnerOmitted = false;
  let previousOwner;
  for (const [index, source] of records.entries()) {
    const line = stripDnsComment(source).trim();
    if (!line) continue;
    if (!pending) pendingOwnerOmitted = /^\s/u.test(source) && !line.startsWith("$");
    parentheses += countParentheses(line, "(") - countParentheses(line, ")");
    if (parentheses < 0) {
      errors.push(`FAIL ${file}:${index + 1}: record parentheses are not balanced.`);
      parentheses = 0;
      pending = "";
      continue;
    }
    pending += `${pending ? " " : ""}${line}`;
    if (parentheses > 0) continue;
    const parsedTokens = tokenizeDnsRecord(pending);
    pending = "";
    const tokens =
      pendingOwnerOmitted && previousOwner ? [previousOwner, ...parsedTokens] : parsedTokens;
    pendingOwnerOmitted = false;
    const result = validateDnsRecord(file, tokens, index + 1);
    errors.push(...result.errors);
    if (result.type) previousOwner = tokens[0];
    if (result.type === "SOA") soa += 1;
    if (result.type === "NS") nameservers += 1;
  }
  if (parentheses !== 0 || pending)
    errors.push(`FAIL ${file}: record parentheses are not balanced.`);
  if (soa !== 1) errors.push(`FAIL ${file}: exactly one SOA record is required.`);
  if (nameservers < 1) errors.push(`FAIL ${file}: at least one NS record is required.`);
  return errors;
}

function stripDnsComment(line) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) escaped = false;
    else if (quoted && character === "\\") escaped = true;
    else if (character === '"') quoted = !quoted;
    else if (!quoted && character === ";") return line.slice(0, index);
  }
  return line;
}

function countParentheses(line, target) {
  let quoted = false;
  let escaped = false;
  let count = 0;
  for (const character of line) {
    if (escaped) escaped = false;
    else if (quoted && character === "\\") escaped = true;
    else if (character === '"') quoted = !quoted;
    else if (!quoted && character === target) count += 1;
  }
  return count;
}
