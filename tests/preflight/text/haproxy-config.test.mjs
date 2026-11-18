import { expect, test } from "@jest/globals";
import validateHaproxyConfig from "../../../src/preflight/text/haproxy-config.mjs";

test("routes HAProxy configuration and ignores other files", () => {
  expect(validateHaproxyConfig("etc/haproxy/haproxy.cfg", "frontend web\n")[0]).toContain(
    "global and defaults sections are required",
  );
  expect(validateHaproxyConfig("other.cfg", "invalid\n")).toEqual([]);
});
