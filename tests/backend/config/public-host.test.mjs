import { expect, test } from "@jest/globals";
import isPublicHost from "../../../src/backend/config/public-host.mjs";

test.each([
  "localhost",
  "router.localhost",
  "router.local",
  "router.internal",
  "router.lan",
  "router.example",
  "host.invalid",
  "router.test",
  "hidden.onion",
  "service.arpa",
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
  "::ffff:192.168.1.1",
  "2001::1",
  "2001:db8::1",
  "3fff::1",
  "5f00::1",
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
  "::ffff:8.8.8.8",
  "2002:c000:201::1",
  "2620:4f:8000::1",
])("accepts public host %s", (host) => {
  expect(isPublicHost(host)).toBe(true);
});
