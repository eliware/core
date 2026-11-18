import { expect, test } from "@jest/globals";
import validateWireguard from "../../src/preflight/wireguard.mjs";

test("accepts a WireGuard interface and peer", () => {
  const text =
    "[Interface]\nAddress=172.16.0.1/30\nListenPort=51820\n[Peer]\nPublicKey=qM9ZUPZbPgNWOmLpF/M1jy8s4qc4YuxFObrKoDFkhTs=\nAllowedIPs=172.16.0.2/32, 2001:db8::1/128\nPersistentKeepalive=25\n";
  expect(validateWireguard("wg0.conf", text)).toEqual([]);
});

test("rejects unknown settings, duplicate values, invalid CIDRs, and peer keys", () => {
  const text =
    "bad line\n[Peer]\nUnknown=bad\n[Interface]\nAddress=bad\nListenPort=0\nListenPort=3\n[Peer]\nPublicKey=bad\nAllowedIPs=10.0.0.1/99\nPersistentKeepalive=no\n";
  const errors = validateWireguard("wg0.conf", text).join(" ");
  expect(errors).toContain("exactly one Interface section must come first");
  expect(errors).toContain("unknown peer setting Unknown");
  expect(errors).toContain("invalid WireGuard setting bad line");
  expect(errors).toContain("duplicate ListenPort setting");
  expect(errors).toContain("Address contains an invalid network prefix");
  expect(errors).toContain("each Peer needs a valid PublicKey");
  expect(errors).toContain("PersistentKeepalive must be between");
});
test("rejects a missing peer and missing interface address", () => {
  expect(validateWireguard("wg0.conf", "[Interface]\nListenPort=51820\n").join(" ")).toContain(
    "at least one Peer section is required",
  );
  expect(validateWireguard("wg0.conf", "[Interface]\nListenPort=51820\n").join(" ")).toContain(
    "Interface Address is required",
  );
});
