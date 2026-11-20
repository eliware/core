import normalizeFrr from "./normalizers/frr.mjs";
import normalizeKea from "./normalizers/kea.mjs";
import normalizeKeepalived from "./normalizers/keepalived.mjs";
import normalizeConntrackd from "./normalizers/conntrackd.mjs";
import normalizeFirewall from "./normalizers/firewall.mjs";
import normalizeShell from "./normalizers/shell.mjs";
import normalizeRepositoryPaths from "./normalizers/repository-path.mjs";

export default function normalizePairFile(path, text, node) {
  let normalized = text.replaceAll("\r\n", "\n");
  normalized = normalizeRepositoryPaths(normalized);
  normalized = normalizeFrr(path, normalized, node);
  normalized = normalizeKea(path, normalized);
  normalized = normalizeKeepalived(path, normalized);
  normalized = normalizeConntrackd(path, normalized);
  normalized = normalizeFirewall(path, normalized);
  return normalizeShell(path, normalized);
}
