import isValidServerAddress from "./server/address.mjs";

const flags = new Set([
  "accept-proxy",
  "defer-accept",
  "disabled",
  "no-tls-tickets",
  "prefer-client-ciphers",
  "ssl",
  "strict-sni",
  "transparent",
  "v4v6",
]);
const valueOptions = new Set([
  "alpn",
  "backlog",
  "ca-file",
  "ca-verify-file",
  "ciphers",
  "ciphersuites",
  "crt",
  "crt-list",
  "curves",
  "gid",
  "group",
  "id",
  "interface",
  "maxconn",
  "maxsslconn",
  "maxsslrate",
  "mode",
  "mss",
  "name",
  "namespace",
  "npn",
  "process",
  "proto",
  "ssl-max-ver",
  "ssl-min-ver",
  "uid",
  "user",
  "verify",
]);

export default function isValidBindDirective(value) {
  const [, address, ...options] = value.trim().split(/\s+/u);
  if (!isValidServerAddress(address ?? "", { allowWildcard: true })) return false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (flags.has(option)) continue;
    const argument = options[index + 1];
    if (!valueOptions.has(option) || !argument) return false;
    if (
      ["backlog", "maxconn", "maxsslconn", "maxsslrate", "mss", "process", "uid", "gid"].includes(
        option,
      )
    ) {
      if (!/^\d+$/u.test(argument)) return false;
    }
    if (option === "verify" && !["none", "required", "optional"].includes(argument)) return false;
    index += 1;
  }
  return true;
}
