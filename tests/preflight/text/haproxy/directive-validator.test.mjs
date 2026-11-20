import { expect, test } from "@jest/globals";
import validateDirectives from "../../../../src/preflight/text/haproxy/directive-validator.mjs";

function validate(kind, value) {
  return validateDirectives("haproxy.cfg", kind, [{ value, line: 4 }]);
}

test.each(["bind", "bind invalid", "bind :0"])("rejects malformed bind directive %s", (value) => {
  expect(validate("frontend", value).errors).toEqual([
    "FAIL haproxy.cfg:4: bind needs a valid address and port.",
  ]);
});

test.each(["bind :80", "bind *:443", "bind [::]:443"])("accepts valid bind address %s", (value) => {
  expect(validate("frontend", value)).toMatchObject({ errors: [], bound: true });
});

test.each(["127.0.0.1:99999", "bad..host:80", "[not-ipv6]:80", "::1:80"])(
  "rejects malformed server addresses %s",
  (address) => {
    expect(validate("backend", `server app ${address}`).errors).toEqual([
      "FAIL haproxy.cfg:4: server needs a valid address and port.",
    ]);
  },
);

test.each([
  "localhost:80",
  "example.test.:65535",
  "[::1]:80",
  "ipv4@127.0.0.1:80",
  "ipv6@[::1]:80",
  "unix@/run/haproxy.sock",
])("accepts valid server address %s", (address) => {
  expect(validate("backend", `server app ${address}`).serverCount).toBe(1);
});

test("validates server names, options, and backend references", () => {
  const valid = validate(
    "backend",
    "server api-1 127.0.0.1:8080 check inter 2s fall 3 rise 2 weight 10",
  );
  expect(valid.errors).toEqual([]);
  expect(valid.serverCount).toBe(1);
  expect(validate("backend", "server bad/name 127.0.0.1:8080 check").serverCount).toBe(0);
  expect(validate("backend", "server api 127.0.0.1:8080 unknown-option").errors).toHaveLength(1);
  expect(validate("backend", "server api 127.0.0.1:8080 verify invalid").errors).toHaveLength(1);
  expect(validate("frontend", "default_backend app").references).toEqual(["app"]);
});
