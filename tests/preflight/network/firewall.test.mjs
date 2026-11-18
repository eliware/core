import { expect, test } from "@jest/globals";
import validateFirewall from "../../../src/preflight/network/firewall.mjs";

test("accepts a committed filter table with a valid rule", () => {
  expect(
    validateFirewall("iptables", "*filter\n:INPUT DROP [0:0]\n-A INPUT -i lo -j ACCEPT\nCOMMIT\n"),
  ).toEqual([]);
});

test("rejects malformed tables, chains, rules, and commit order", () => {
  const result = validateFirewall(
    "iptables",
    "COMMIT\n*filter\n:INPUT DROP [0:0]\n-A INPUT -i lo\n*wrong\n:INPUT BAD [x]\n-A OTHER -j UNKNOWN\nunknown\n",
  ).join(" ");
  expect(result).toContain("unexpected COMMIT");
  expect(result).toContain("unsupported table");
  expect(result).toContain("invalid or duplicate chain declaration");
  expect(result).toContain("rule has an unknown chain or missing target");
  expect(result).toContain("unknown firewall statement");
  expect(result).toContain("lacks COMMIT");
  expect(validateFirewall("iptables", "").join(" ")).toContain("filter table is required");
});
