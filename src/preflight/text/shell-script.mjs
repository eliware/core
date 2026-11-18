import validateShell from "./shell.mjs";

export default function validateShellScript(file, text) {
  return file.endsWith(".sh") ? validateShell(file, text) : [];
}
