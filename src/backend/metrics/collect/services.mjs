import { execFile as nodeExecFile } from "node:child_process";
import { readFile as nodeReadFile } from "node:fs/promises";
import { promisify } from "node:util";
import readSocket from "../socket-reader.mjs";
import collectHaproxy from "./services/haproxy.mjs";
import collectLeases from "./services/leases.mjs";
import collectDnsCache from "./services/dns-cache.mjs";
import collectNtp from "./services/ntp.mjs";

const execFile = promisify(nodeExecFile);

export default function collectServiceMetric(metric, dependencies = {}) {
  const options = {
    run: execFile,
    readFile: nodeReadFile,
    socket: readSocket,
    now: () => new Date(),
    timeoutMs: 10_000,
    ...dependencies,
  };
  switch (metric.type) {
    case "haproxy":
      return collectHaproxy(metric, options);
    case "dhcp-leases":
      return collectLeases(metric, options);
    case "dns-cache":
      return collectDnsCache(metric, options);
    case "ntp":
      return collectNtp(options);
    default:
      return Promise.reject(new Error("Unsupported service metric type"));
  }
}
