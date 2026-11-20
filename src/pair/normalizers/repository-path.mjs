export default function normalizeRepositoryPaths(text) {
  return text.replace(/\/eliware\/[^/]+(?=\/)/gu, "/eliware/router");
}
