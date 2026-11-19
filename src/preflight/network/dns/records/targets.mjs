import isValidDnsName from "./name.mjs";

export default function validateTargetRecord(type, fields) {
  const integer = (value, max) => /^\d+$/u.test(value ?? "") && Number(value) <= max;
  if (type === "SOA") {
    const timers = fields.slice(2);
    return fields.length === 7 &&
      isValidDnsName(fields[0]) &&
      isValidDnsName(fields[1]) &&
      timers.length === 5 &&
      timers.every((timer) => /^\d+$/u.test(timer))
      ? null
      : "SOA record needs valid names and five numeric timers";
  }
  if (type === "NS" && (fields.length !== 1 || !isValidDnsName(fields[0])))
    return "NS record has an invalid target name";
  if (["PTR", "CNAME"].includes(type) && (fields.length !== 1 || !isValidDnsName(fields[0])))
    return `${type} record has an invalid target name`;
  if (
    type === "MX" &&
    (fields.length !== 2 || !integer(fields[0], 65535) || !isValidDnsName(fields[1]))
  )
    return "MX record needs a valid preference and target name";
  if (
    type === "SRV" &&
    (fields.length !== 4 ||
      fields.slice(0, 3).some((field) => !integer(field, 65535)) ||
      !isValidDnsName(fields[3]))
  )
    return "SRV record needs three valid numbers and a target name";
  return null;
}
