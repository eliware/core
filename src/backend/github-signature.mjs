import { createHmac, timingSafeEqual } from "node:crypto";

export default function verifyGitHubSignature({ body, signature, secret }) {
  if (!Buffer.isBuffer(body) || typeof signature !== "string" || !secret) return false;
  if (!/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
