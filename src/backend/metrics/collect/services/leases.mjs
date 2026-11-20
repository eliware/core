import summarizeLeases from "../../dhcp-leases.mjs";

export default async function collectLeases(metric, { readFile, now }) {
  return summarizeLeases(await readFile(metric.path, "utf8"), metric.format, now().getTime());
}
