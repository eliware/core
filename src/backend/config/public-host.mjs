import { isIP } from "node:net";

export default function isPublicHost(hostname) {
  const host = (hostname.startsWith("[") ? hostname.slice(1, -1) : hostname).toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan")
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
      const [high, low] = host
        .slice("::ffff:".length)
        .split(":")
        .map((part) => parseInt(part, 16));
      const address = [high >> 8, high & 255, low >> 8, low & 255].join(".");
      return isPublicHost(address);
    }
    return !(host === "::" || host === "::1" || /^f[cd]/u.test(host) || /^fe[89ab]/u.test(host));
  }
  if (!host.includes(".")) return false;
  return true;
}
