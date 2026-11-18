import validateChrony from "./text/chrony.mjs";
import validateHaproxy from "./text/haproxy.mjs";
import validateShell from "./text/shell.mjs";

export default function validateText(file, text) {
  if (file === "etc/chrony.conf") return validateChrony(file, text);
  if (file === "etc/haproxy/haproxy.cfg") return validateHaproxy(file, text);
  if (file.endsWith(".sh")) return validateShell(file, text);
  return [];
}
