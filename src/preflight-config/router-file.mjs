export default function isRouterFile(file) {
  return /^(etc|var|scripts)\//u.test(file) && !file.endsWith(".mjs");
}
