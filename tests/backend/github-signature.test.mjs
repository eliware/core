import { createHmac } from "node:crypto";
import { expect, test } from "@jest/globals";
import verifyGitHubSignature from "../../src/backend/github-signature.mjs";

test("verifies a valid GitHub SHA-256 signature", () => {
  const body = Buffer.from('{"ref":"refs/heads/main"}');
  const signature = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
  expect(verifyGitHubSignature({ body, signature, secret: "secret" })).toBe(true);
});

test.each([
  [{ body: "body", signature: "sha256=bad", secret: "secret" }],
  [{ body: Buffer.from("body"), signature: "sha256=bad", secret: "secret" }],
  [{ body: Buffer.from("body"), signature: "sha256=" + "a".repeat(64), secret: "secret" }],
  [{ body: Buffer.from("body"), signature: "sha256=" + "a".repeat(64) }],
])("rejects invalid signature input %s", (input) => {
  expect(verifyGitHubSignature(input)).toBe(false);
});
