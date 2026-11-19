import { expect, test } from "@jest/globals";
import hasFirewallRuleAction from "../../../src/preflight/network/firewall-rule.mjs";

test.each([
  "--bogus value -j ACCEPT",
  "! --bogus -j ACCEPT",
  "! -s -j ACCEPT",
  "-i -j ACCEPT",
  "-i lo -j ACCEPT --bogus value",
  "-i lo -j ACCEPT -j DROP",
  "-j UNKNOWN",
])("rejects malformed firewall rule options: %s", (rule) => {
  expect(hasFirewallRuleAction(rule)).toBe(false);
});

test("accepts quoted comments with known options", () => {
  expect(hasFirewallRuleAction('-m comment --comment "Allow local traffic" -j ACCEPT')).toBe(true);
});

test("accepts negated selectors and boolean options", () => {
  expect(hasFirewallRuleAction("! -s 10.0.0.0/8 -f -j ACCEPT")).toBe(true);
});
