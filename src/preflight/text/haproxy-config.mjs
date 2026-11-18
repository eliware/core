import validateHaproxy from "./haproxy.mjs";

export default function validateHaproxyConfig(file, text) {
  return file === "etc/haproxy/haproxy.cfg" ? validateHaproxy(file, text) : [];
}
