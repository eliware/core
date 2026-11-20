import { readFile as nodeReadFile } from "node:fs/promises";
import { readlink as nodeReadlink } from "node:fs/promises";

const maximumSignal = 64;

export default async function collectVrrpSnapshot(
  metric,
  {
    run,
    readFile = nodeReadFile,
    readlink = nodeReadlink,
    signalProcess = process.kill,
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    vrrpDelayMs = 50,
    timeoutMs = 10_000,
  },
) {
  try {
    const pidSource = await readFile(metric.pidPath ?? "/run/keepalived.pid", "utf8");
    const pid = Number(pidSource.trim());
    if (Number.isSafeInteger(pid) && pid > 0) {
      const processName = await readFile(`/proc/${pid}/comm`, "utf8");
      if (processName.trim() === "keepalived") {
        const executable = await readlink(`/proc/${pid}/exe`);
        const { stdout } = await run(executable, ["--signum=JSON"], { timeout: timeoutMs });
        const signal = Number(stdout.trim());
        if (Number.isSafeInteger(signal) && signal > 0 && signal <= maximumSignal) {
          signalProcess(pid, signal);
          await wait(vrrpDelayMs);
        }
      }
    }
  } catch {
    // Use the configured snapshot when Keepalived cannot produce a new one.
  }
  return readFile(metric.path ?? "/tmp/keepalived.json", "utf8");
}
