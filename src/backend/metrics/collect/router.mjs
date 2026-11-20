import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";
import summarizeInterfaces from "../interfaces.mjs";
import summarizeRoutes from "../routes.mjs";
import summarizeNeighbors from "../neighbors.mjs";
import summarizeFrr from "../frr.mjs";
import collectVrrp from "./vrrp.mjs";

const execFile = promisify(nodeExecFile);

export default async function collectRouterMetric(
  metric,
  {
    run = execFile,
    readFile,
    readlink,
    signalProcess,
    vrrpDelayMs = 50,
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
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
    case "vrrp":
      return collectVrrp(metric, {
        run,
        readFile,
        readlink,
        signalProcess,
        vrrpDelayMs,
        wait,
        timeoutMs,
      });
    default:
      throw new Error("Unsupported metric type");
  }
}
