import { expect, test } from "@jest/globals";
import isValidServerDirective from "../../../../../src/preflight/text/haproxy/server/directive.mjs";

test("accepts a named server with supported options", () => {
  expect(
    isValidServerDirective(
      "server api-1 127.0.0.1:8080 check inter 2s fall 3 rise 2 weight 10 verify none",
    ),
  ).toBe(true);
});

test.each([
  "server",
  "server 127.0.0.1:8080",
  "server api",
  "server bad/name 127.0.0.1:8080",
  "server api bad-address",
  "server api 127.0.0.1:8080 unknown",
  "server api 127.0.0.1:8080 inter",
  "server api 127.0.0.1:8080 inter fast",
  "server api 127.0.0.1:8080 fall many",
  "server api 127.0.0.1:8080 port 70000",
  "server api 127.0.0.1:8080 verify bad",
])("rejects an invalid server directive: %s", (directive) => {
  expect(isValidServerDirective(directive)).toBe(false);
});
