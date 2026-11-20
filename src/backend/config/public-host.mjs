import { isIP } from "node:net";

export default function isPublicHost(hostname) {
  const host = (hostname.startsWith("[") ? hostname.slice(1, -1) : hostname).toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    [".example", ".invalid", ".test", ".onion", ".alt", ".arpa"].some((suffix) =>
      host.endsWith(suffix),
    )
  ) {
    return false;
  }
  const version = isIP(host);
  if (version === 4) {
    const [first, second] = host.split(".").map(Number);
    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      first >= 224
    );
  }
  if (version === 6) {
    if (host.startsWith("::ffff:")) {
      const mapped = host.slice("::ffff:".length);
      if (mapped.includes(".")) return isPublicHost(mapped);
      const [high, low] = mapped.split(":").map((part) => parseInt(part, 16));
      const address = [high >> 8, high & 255, low >> 8, low & 255].join(".");
      return isPublicHost(address);
    }
    const [firstPart, secondPart] = host.split(":");
    const first = Number.parseInt(firstPart || "0", 16);
    const second = Number.parseInt(secondPart || "0", 16);
    const isGlobalUnicast = first >= 0x2000 && first < 0x4000;
    const isIetfProtocolAssignment = first === 0x2001 && second < 0x0200;
    const isDocumentationAddress = first === 0x2001 && second === 0x0db8;
    const isDocumentationRange = first === 0x3fff && second < 0x1000;
    return (
      isGlobalUnicast &&
      !isIetfProtocolAssignment &&
      !isDocumentationAddress &&
      !isDocumentationRange
    );
  }
  if (!host.includes(".")) return false;
  return true;
}
