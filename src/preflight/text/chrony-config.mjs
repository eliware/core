import validateChrony from "./chrony.mjs";

export default function validateChronyConfig(file, text) {
  return file === "etc/chrony.conf" ? validateChrony(file, text) : [];
}
