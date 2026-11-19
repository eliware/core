import summarizeVrrp from "../vrrp.mjs";

export default async function collectVrrp(metric, { readFile, signalProcess, wait }) {
  try {
    const pidSource = await readFile(metric.pidPath ?? "/run/keepalived_vrrp.pid", "utf8");
    const pid = Number(pidSource.trim());
    if (Number.isSafeInteger(pid) && pid > 0) {
      signalProcess(pid, "SIGUSR1");
      await wait();
    }
  } catch {
    // Use the configured snapshot when the process cannot produce a new one.
  }
  return summarizeVrrp(await readFile(metric.path ?? "/tmp/keepalived.json", "utf8"));
}
