import validateConntrackd from "./structured/conntrackd.mjs";
import validateKeepalived from "./structured/keepalived.mjs";
import validateNamed from "./structured/named.mjs";
import validateSystemd from "./structured/systemd.mjs";

export default function validateStructured(file, text, files, root, readFile) {
  if (file.startsWith("etc/systemd/") && /\.(?:conf|service|timer)$/u.test(file))
    return validateSystemd(file, text, files);
  if (file === "etc/named.conf" || file === "etc/named.rfc1912.zones")
    return validateNamed(file, text, files, root, readFile);
  if (file === "etc/keepalived/keepalived.conf") return validateKeepalived(file, text, files);
  if (file === "etc/conntrackd/conntrackd.conf") return validateConntrackd(file, text);
  return [];
}
