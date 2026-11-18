import { expect, test } from "@jest/globals";
import normalizeFirewall from "../../../src/pair/normalizers/firewall.mjs";

test("sorts IPv6 firewall connection states", () => {
  expect(normalizeFirewall("etc/sysconfig/ip6tables", "--ctstate RELATED,ESTABLISHED\n")).toBe(
    "--ctstate ESTABLISHED,RELATED\n",
  );
  expect(normalizeFirewall("etc/sysconfig/iptables", "--ctstate RELATED,ESTABLISHED\n")).toBe(
    "--ctstate RELATED,ESTABLISHED\n",
  );
});
