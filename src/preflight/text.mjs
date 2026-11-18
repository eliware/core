import validateChronyConfig from "./text/chrony-config.mjs";
import validateHaproxyConfig from "./text/haproxy-config.mjs";
import validateShellScript from "./text/shell-script.mjs";

export default function validateText(file, text) {
  return [
    ...validateChronyConfig(file, text),
    ...validateHaproxyConfig(file, text),
    ...validateShellScript(file, text),
  ];
}
