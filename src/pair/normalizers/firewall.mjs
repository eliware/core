export default function normalizeFirewall(path, text) {
  if (path !== "etc/sysconfig/ip6tables") return text;
  return text.replace(/--ctstate\s+([A-Z,]+)/gu, (_all, states) => {
    return `--ctstate ${states.split(",").sort().join(",")}`;
  });
}
