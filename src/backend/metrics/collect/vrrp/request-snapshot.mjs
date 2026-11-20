import { readFile as nodeReadFile, readlink as nodeReadlink } from "node:fs/promises";
import { basename } from "node:path";

const maximumSignal = 64;

export default async function requestVrrpSnapshot(
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
  const pidSource = await readFile(metric.pidPath ?? "/run/keepalived.pid", "utf8");
  const pid = Number(pidSource.trim());
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  const processName = await readFile(`/proc/${pid}/comm`, "utf8");
  if (processName.trim() !== "keepalived") return;
  const executable = await readlink(`/proc/${pid}/exe`);
  if (basename(executable).replace(/ \(deleted\)$/u, "") !== "keepalived") return;
  const { stdout } = await run(`/proc/${pid}/exe`, ["--signum=JSON"], { timeout: timeoutMs });
  const signal = Number(stdout.trim());
  if (!Number.isSafeInteger(signal) || signal <= 0 || signal > maximumSignal) return;
  signalProcess(pid, signal);
  await wait(vrrpDelayMs);
}
