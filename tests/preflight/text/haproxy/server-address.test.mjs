import { expect, test } from "@jest/globals";
import isValidServerAddress from "../../../../src/preflight/text/haproxy/server-address.mjs";

test.each([
  ["unix@/run/haproxy.sock", true],
  ["localhost:80", true],
  ["example.test.:65535", true],
  ["127.0.0.1:80", true],
  ["ipv4@127.0.0.1:80", true],
  ["[::1]:80", true],
  ["ipv6@[::1]:80", true],
  ["::1:80", false],
  ["ipv6@localhost:80", false],
  ["ipv6@127.0.0.1:80", false],
  ["ipv4@[::1]:80", false],
  ["bad..host:80", false],
  ["-bad-label:80", false],
  ["host", false],
  ["host:0", false],
  ["host:65536", false],
  ["host:abc", false],
  ["[not-ipv6]:80", false],
])("validates HAProxy server address %s", (address, expected) => {
  expect(isValidServerAddress(address)).toBe(expected);
});
