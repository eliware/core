import { readFile as nodeReadFile } from "node:fs/promises";
import requestVrrpSnapshot from "./vrrp/request-snapshot.mjs";

export default async function collectVrrpSnapshot(metric, dependencies = {}) {
  try {
    await requestVrrpSnapshot(metric, dependencies);
  } catch {
    // Use the configured snapshot when Keepalived cannot produce a new one.
  }
  const readFile = dependencies.readFile ?? nodeReadFile;
  return readFile(metric.path ?? "/tmp/keepalived.json", "utf8");
}
