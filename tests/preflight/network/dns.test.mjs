import { expect, test } from "@jest/globals";
import validateDns from "../../../src/preflight/network/dns.mjs";

test("checks SOA timers, DNS targets, and IP record values", () => {
  const valid =
    "@ IN SOA ns.test. host.test. (\n 1 3600 600 86400 300 )\n@ IN NS ns.test.\n@ IN A 192.0.2.1\nwww IN CNAME @\n6 IN PTR ns.test.\n@ IN AAAA 2001:db8::1\n";
  expect(validateDns("var/named/zones/test.zone", valid)).toEqual([]);
  const invalid =
    "@ IN SOA ns.test. host.test. (1)\n@ IN NS bad/name\n@ IN A nope\n@ IN CNAME bad/name\n";
  expect(validateDns("test.zone", invalid).join(" ")).toContain("SOA record needs valid names");
  expect(validateDns("test.zone", invalid).join(" ")).toContain("invalid address");
  expect(validateDns("test.zone", invalid).join(" ")).toContain("invalid target name");
});

test("preserves semicolons and parentheses inside quoted TXT data", () => {
  const zone =
    '@ IN SOA ns.test. host.test. (1 3600 600 86400 300)\n@ IN NS ns.test.\n@ IN TXT "part; two (three)" ; comment\n@ IN TXT "escaped \\\"; still quoted"\n';
  expect(validateDns("test.zone", zone)).toEqual([]);
});

test("requires complete DNS zone records and balanced parentheses", () => {
  expect(validateDns("test.zone", "@").join(" ")).toContain("invalid DNS record");
  expect(validateDns("test.zone", ")").join(" ")).toContain("record parentheses are not balanced");
  expect(
    validateDns("test.zone", "$TTL 3600\n@ IN SOA ns.test. host.test. (1\n").join(" "),
  ).toContain("parentheses are not balanced");
});

test("rejects a closing parenthesis without an open record group", () => {
  const zone = "@ IN SOA ns.test. host.test. (1 3600 600 86400 300)\n@ IN NS ns.test.\n)\n";

  expect(validateDns("test.zone", zone).join(" ")).toContain("record parentheses are not balanced");
});

test("accepts standard zone directives and reports malformed directives", () => {
  const zone =
    "$ORIGIN example.test.\n$TTL 1h\n$INCLUDE child.zone child.example.test.\n$GENERATE 1-2 host$.example.test. A 192.0.2.$\n@ IN SOA ns.example.test. host.example.test. ( 1 3600 600 86400 300 )\n@ IN NS ns.example.test.\n";
  expect(validateDns("test.zone", zone)).toEqual([]);
  expect(validateDns("test.zone", "$INCLUDE\n").join(" ")).toContain(
    "invalid DNS directive $INCLUDE",
  );
  expect(validateDns("test.zone", "$UNKNOWN value\n").join(" ")).toContain(
    "invalid DNS directive $UNKNOWN",
  );
  expect(validateDns("test.zone", "$GENERATE invalid host A 192.0.2.$\n").join(" ")).toContain(
    "invalid DNS directive $GENERATE",
  );
  expect(validateDns("test.zone", "$GENERATE 1-3 host$\n").join(" ")).toContain(
    "invalid DNS directive $GENERATE",
  );
  expect(validateDns("test.zone", "$GENERATE\n").join(" ")).toContain(
    "invalid DNS directive $GENERATE",
  );
});
