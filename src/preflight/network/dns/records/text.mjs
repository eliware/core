export default function validateTextRecord(type, fields) {
  if (type === "CAA") {
    const validFlags = /^\d+$/u.test(fields[0] ?? "") && Number(fields[0]) <= 255;
    const validTag = /^[A-Za-z0-9-]+$/u.test(fields[1] ?? "");
    return fields.length === 3 && validFlags && validTag && fields[2]
      ? null
      : "CAA record needs valid flags, a tag, and a value";
  }
  if (type === "TXT") {
    if (fields.some((field) => field.length === 0)) return "TXT record contains an empty value";
    if (fields.some((field) => !/^"(?:[^"\\]|\\.)*"$/u.test(field)) || fields.length === 0)
      return "TXT record values must be quoted strings";
  }
  return null;
}
