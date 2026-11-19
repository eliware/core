import { execFile as nodeExecFile } from "node:child_process";
import { readFile as nodeReadFile } from "node:fs/promises";
import { promisify } from "node:util";
import parseHaproxyStats from "../haproxy.mjs";
import summarizeLeases from "../dhcp-leases.mjs";
import summarizeBindStats from "../dns-cache.mjs";
import parseChronyTracking from "../ntp.mjs";
import readSocket from "../socket-reader.mjs";

const execFile = promisify(nodeExecFile);

export default async function collectServiceMetric(
  metric,
  {
    run = execFile,
    readFile = nodeReadFile,
    socket = readSocket,
    connect,
    now = () => new Date(),
    timeoutMs = 10_000,
  } = {},
) {
  switch (metric.type) {
    case "haproxy":
      return parseHaproxyStats(
        await (connect
          ? readSocket(metric.socketPath, timeoutMs, connect)
          : socket(metric.socketPath, timeoutMs)),
      );
    case "dhcp-leases":
      return summarizeLeases(await readFile(metric.path, "utf8"), metric.format, now().getTime());
    case "dns-cache":
      return summarizeBindStats(await readFile(metric.path, "utf8"));
    case "ntp": {
      const { stdout } = await run("chronyc", ["-n", "tracking"], { timeout: timeoutMs });
      return parseChronyTracking(stdout);
    }
    default:
      throw new Error("Unsupported service metric type");
  }
}
