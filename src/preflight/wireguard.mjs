import { isIP } from "node:net";

const interfaceKeys = [
  "Address",
  "ListenPort",
  "PrivateKey",
  "DNS",
  "MTU",
  "Table",
  "PreUp",
  "PostUp",
  "PreDown",
  "PostDown",
  "SaveConfig",
];
const peerKeys = [
  "PublicKey",
  "PresharedKey",
  "AllowedIPs",
  "Endpoint",
  "PersistentKeepalive",
  "PreUp",
  "PostUp",
  "PreDown",
  "PostDown",
];
const repeatableKeys = ["Address", "AllowedIPs", "PreUp", "PostUp", "PreDown", "PostDown"];

export default function validateWireguard(file, text) {
  const errors = [];
  const fail = (message) => errors.push(`FAIL ${file}: ${message}.`);
  const sections = [];
  let current;
  for (const line of text.split(/\r?\n/u)) {
    const heading = line.match(/^\s*\[(Interface|Peer)\]\s*$/u);
    if (heading) {
      current = { type: heading[1].toLowerCase(), values: new Map() };
      sections.push(current);
      continue;
    }
    const clean = line.replace(/#.*$/u, "").trim();
    if (!clean) continue;
    const setting = clean.match(/^([A-Za-z][A-Za-z0-9]*)\s*=\s*(.*?)\s*$/u);
    if (!setting || !current) {
      fail(`invalid WireGuard setting ${clean}`);
      continue;
    }
    const allowed = current.type === "interface" ? interfaceKeys : peerKeys;
    if (!allowed.includes(setting[1])) fail(`unknown ${current.type} setting ${setting[1]}`);
    if (current.values.has(setting[1]) && !repeatableKeys.includes(setting[1]))
      fail(`duplicate ${setting[1]} setting`);
    current.values.set(setting[1], setting[2]);
    if (setting[1] === "Address" || setting[1] === "AllowedIPs")
      validateCidrs(setting[1], setting[2], fail);
  }
  const interfaces = sections.filter((section) => section.type === "interface");
  const peers = sections.filter((section) => section.type === "peer");
  if (interfaces.length !== 1 || sections[0]?.type !== "interface")
    fail("exactly one Interface section must come first");
  if (peers.length === 0) fail("at least one Peer section is required");
  for (const section of interfaces) {
    if (!section.values.has("Address")) fail("Interface Address is required");
    const port = Number(section.values.get("ListenPort"));
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      fail("Interface ListenPort must be between 1 and 65535");
  }
  for (const section of peers) {
    if (!validKey(section.values.get("PublicKey") ?? "")) fail("each Peer needs a valid PublicKey");
    if (!section.values.has("AllowedIPs")) fail("each Peer needs AllowedIPs");
    const keepalive = section.values.get("PersistentKeepalive");
    if (keepalive !== undefined && (!/^\d+$/u.test(keepalive) || Number(keepalive) > 65535))
      fail("PersistentKeepalive must be between 0 and 65535");
  }
  return errors;
}

function validateCidrs(key, value, fail) {
  for (const cidr of value.split(",").map((item) => item.trim())) {
    const [ip, prefix, extra] = cidr.split("/");
    const bits = Number(prefix);
    if (
      extra ||
      !isIP(ip) ||
      !Number.isInteger(bits) ||
      bits < 0 ||
      bits > (isIP(ip) === 4 ? 32 : 128)
    )
      fail(`${key} contains an invalid network prefix`);
  }
}

function validKey(value) {
  return /^[A-Za-z0-9+/]{43}=$/u.test(value) && Buffer.from(value, "base64").length === 32;
}
