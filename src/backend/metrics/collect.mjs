import { execFile as nodeExecFile } from "node:child_process";
import { readFile as nodeReadFile } from "node:fs/promises";
import { promisify } from "node:util";
import summarizeInterfaces from "./interfaces.mjs";
import parseHaproxyStats from "./haproxy.mjs";
import summarizeLeases from "./dhcp-leases.mjs";
import summarizeBindStats from "./dns-cache.mjs";
import parseChronyTracking from "./ntp.mjs";
import summarizeRoutes from "./routes.mjs";
import summarizeNeighbors from "./neighbors.mjs";
import summarizeFrr from "./frr.mjs";
import summarizeVrrp from "./vrrp.mjs";
import readSocket from "./socket-reader.mjs";

const execFile = promisify(nodeExecFile);

export default async function collectMetric(
  metric,
  {
    run = execFile,
    readFile = nodeReadFile,
    socket = readSocket,
    connect,
    signalProcess = process.kill,
    vrrpDelayMs = 50,
    now = () => new Date(),
    timeoutMs = 10_000,
  } = {},
) {
  switch (metric.type) {
    case "interfaces": {
      const { stdout } = await run("ip", ["-j", "-s", "address", "show"], {
        timeout: timeoutMs,
      });
      return summarizeInterfaces(JSON.parse(stdout));
    }
    case "routes": {
      const { stdout } = await run("ip", ["-j", "route", "show", "table", "all"], {
        timeout: timeoutMs,
      });
      return summarizeRoutes(JSON.parse(stdout));
    }
    case "arp": {
      const { stdout } = await run("ip", ["-4", "-j", "neigh", "show"], {
        timeout: timeoutMs,
      });
      return summarizeNeighbors(JSON.parse(stdout));
    }
    case "frr": {
      const [summary, routes] = await Promise.all([
        run("vtysh", ["-c", "show bgp summary json"], { timeout: timeoutMs }),
        run("vtysh", ["-c", "show ip route json"], { timeout: timeoutMs }),
      ]);
      return summarizeFrr(summary.stdout, routes.stdout);
    }
    case "vrrp": {
      const pidSource = await readFile(metric.pidPath ?? "/run/keepalived_vrrp.pid", "utf8");
      const pid = Number(pidSource.trim());
      if (!Number.isSafeInteger(pid) || pid < 1)
        throw new Error("Keepalived VRRP process ID is invalid");
      signalProcess(pid, "SIGUSR1");
      await new Promise((resolve) => setTimeout(resolve, vrrpDelayMs));
      return summarizeVrrp(await readFile(metric.path ?? "/tmp/keepalived.json", "utf8"));
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
