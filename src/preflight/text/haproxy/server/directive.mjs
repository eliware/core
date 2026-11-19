import isValidServerAddress from "./address.mjs";

const flags = new Set([
  "agent-check",
  "backup",
  "check",
  "check-ssl",
  "check-send-proxy",
  "disabled",
  "enabled",
  "send-proxy",
  "send-proxy-v2",
  "send-proxy-v2-ssl",
  "ssl",
  "stick",
]);
const valueOptions = new Set([
  "agent-addr",
  "agent-inter",
  "agent-port",
  "agent-send",
  "alpn",
  "ca-file",
  "check-sni",
  "ciphers",
  "crt",
  "error-limit",
  "fall",
  "id",
  "init-addr",
  "init-state",
  "inter",
  "maxconn",
  "maxqueue",
  "minconn",
  "on-error",
  "on-marked-down",
  "port",
  "resolve-opts",
  "resolve-prefer",
  "resolvers",
  "rise",
  "sni",
  "slowstart",
  "source",
  "track",
  "usesrc",
  "verify",
  "verifyhost",
  "weight",
]);

export default function isValidServerDirective(value) {
  const [, name, address, ...options] = value.trim().split(/\s+/u);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/u.test(name ?? "") || !isValidServerAddress(address ?? ""))
    return false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (flags.has(option)) continue;
    const argument = options[index + 1];
    if (!valueOptions.has(option) || !argument) return false;
    if (isCountOption(option) && !/^\d+$/u.test(argument)) return false;
    if (isDurationOption(option) && !/^\d+(?:ms|s|m|h|d)?$/u.test(argument)) return false;
    if (
      isPortOption(option) &&
      (!/^\d+$/u.test(argument) || Number(argument) < 1 || Number(argument) > 65535)
    )
      return false;
    if (option === "verify" && !["none", "required", "optional"].includes(argument)) return false;
    index += 1;
  }
  return true;
}

function isCountOption(option) {
  return ["fall", "rise", "weight", "maxconn", "maxqueue", "minconn", "error-limit"].includes(
    option,
  );
}

function isDurationOption(option) {
  return ["inter", "agent-inter", "slowstart"].includes(option);
}

function isPortOption(option) {
  return option === "port" || option === "agent-port";
}
