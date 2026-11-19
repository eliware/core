import { execFile as nodeExecFile } from "node:child_process";
import { createConnection } from "node:net";
import { readFile as nodeReadFile } from "node:fs/promises";
import { promisify } from "node:util";
import summarizeInterfaces from "./interfaces.mjs";
import parseHaproxyStats from "./haproxy.mjs";
import summarizeLeases from "./dhcp-leases.mjs";
import summarizeBindStats from "./dns-cache.mjs";
import parseChronyTracking from "./ntp.mjs";

const execFile = promisify(nodeExecFile);

function readSocket(socketPath, timeoutMs, connect = createConnection) {
  return new Promise((resolve, reject) => {
    const socket = connect(socketPath);
    let output = "";
    const timeout = setTimeout(
      () => socket.destroy(new Error("HAProxy socket timed out")),
      timeoutMs,
    );
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.end("show stat\n"));
    socket.on("data", (chunk) => {
      output += chunk;
    });
    socket.on("end", () => {
      clearTimeout(timeout);
      resolve(output);
    });
    socket.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    socket.on("close", () => clearTimeout(timeout));
  });
}

export default async function collectMetric(
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
    case "interfaces": {
      const { stdout } = await run("ip", ["-j", "-s", "link"], { timeout: timeoutMs });
      return summarizeInterfaces(JSON.parse(stdout));
    }
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
      throw new Error("Unsupported metric type");
  }
}
