import { isIP } from "node:net";

export default function validateAddressRecord(type, fields) {
  if (!["A", "AAAA"].includes(type)) return null;
  if (fields.length === 1 && isIP(fields[0]) === (type === "A" ? 4 : 6)) return null;
  return `${type} record has an invalid address`;
}
