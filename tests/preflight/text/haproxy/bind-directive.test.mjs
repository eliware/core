import { expect, test } from "@jest/globals";
import isValidBindDirective from "../../../../src/preflight/text/haproxy/bind-directive.mjs";

test.each([
  "bind :80",
  "bind *:443 ssl crt /etc/pki/server.pem",
  "bind [::]:443 v4v6",
  "bind :80 backlog 10",
])("accepts a valid bind directive: %s", (directive) => {
  expect(isValidBindDirective(directive)).toBe(true);
});

test.each([
  "bind",
  "bind invalid",
  "bind :0",
  "bind :80 unsupported",
  "bind :80 backlog",
  "bind :80 backlog bad",
  "bind :80 verify invalid",
])("rejects an invalid bind directive: %s", (directive) => {
  expect(isValidBindDirective(directive)).toBe(false);
});
