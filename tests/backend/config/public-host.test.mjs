import { expect, test } from "@jest/globals";
import isPublicHost from "../../../src/backend/config/public-host.mjs";

test.each([
  "localhost",
  "router.localhost",
  "router.local",
  "router.internal",
  "router.lan",
  "router",
  "127.0.0.1",
  "10.1.2.3",
  "172.16.0.1",
  "192.168.1.1",
  "100.64.0.1",
  "169.254.1.1",
  "224.0.0.1",
  "::",
  "::1",
  "fc00::1",
  "fd00::1",
  "fe80::1",
  "::ffff:c0a8:0101",
])("rejects non-public host %s", (host) => {
  expect(isPublicHost(host)).toBe(false);
});

test.each([
  "router.example.com",
  "8.8.8.8",
  "100.128.0.1",
  "172.32.0.1",
  "192.0.2.1",
  "2001:4860:4860::8888",
  "::ffff:808:808",
])("accepts public host %s", (host) => {
  expect(isPublicHost(host)).toBe(true);
});
