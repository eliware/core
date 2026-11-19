import { expect, test } from "@jest/globals";
import validateFirewall from "../../../src/preflight/network/firewall.mjs";

test("accepts a committed filter table with a valid rule", () => {
  expect(
    validateFirewall("iptables", "*filter\n:INPUT DROP [0:0]\n-A INPUT -i lo -j ACCEPT\nCOMMIT\n"),
  ).toEqual([]);
});

test.each([
  "-A INPUT --bogus value -j ACCEPT",
  "-A INPUT ! --bogus -j ACCEPT",
  "-A INPUT ! -s -j ACCEPT",
  "-A INPUT -i -j ACCEPT",
  "-A INPUT -i lo -j ACCEPT --bogus value",
  "-A INPUT -i lo -j ACCEPT -j DROP",
  "-A INPUT -j UNKNOWN",
])("rejects malformed firewall rule options: %s", (rule) => {
  expect(validateFirewall("iptables", `*filter\n:INPUT DROP [0:0]\n${rule}\nCOMMIT\n`)).toContain(
    "FAIL iptables:3: rule has an unknown chain or missing target.",
  );
});

test("accepts a quoted comment with known firewall options", () => {
  expect(
    validateFirewall(
      "iptables",
      '*filter\n:INPUT DROP [0:0]\n-A INPUT -m comment --comment "Allow local traffic" -j ACCEPT\nCOMMIT\n',
    ),
  ).toEqual([]);
});

test("accepts negated selectors and boolean options", () => {
  expect(
    validateFirewall(
      "iptables",
      "*filter\n:INPUT DROP [0:0]\n-A INPUT ! -s 10.0.0.0/8 -f -j ACCEPT\nCOMMIT\n",
    ),
  ).toEqual([]);
});

test("rejects a repeated table declaration", () => {
  const rules = "*filter\n:INPUT DROP [0:0]\nCOMMIT\n*filter\n:OUTPUT ACCEPT [0:0]\nCOMMIT\n";
  expect(validateFirewall("iptables", rules)).toContain("FAIL iptables:4: duplicate table filter.");
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

test("rejects rules that reference an undeclared chain", () => {
  expect(
    validateFirewall("iptables", "*filter\n:INPUT DROP [0:0]\n-A MISSING -j ACCEPT\nCOMMIT\n"),
  ).toContain("FAIL iptables:3: rule has an unknown chain or missing target.");
});
