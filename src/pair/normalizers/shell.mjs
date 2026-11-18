export default function normalizeShell(path, text) {
  if (path !== "scripts/frr-connected-prefix.sh") return text;
  return text.replace(/^(address=")[^/]+(\/\d+")$/mu, "$1<local-address>$2");
}
