import summarizeBindStats from "../../dns-cache.mjs";

export default async function collectDnsCache(metric, { readFile }) {
  return summarizeBindStats(await readFile(metric.path, "utf8"));
}
