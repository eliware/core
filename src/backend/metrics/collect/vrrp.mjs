import summarizeVrrp from "../vrrp.mjs";

export default async function collectVrrp(
  metric,
  { readFile, signalProcess, getJsonSignal, wait },
) {
  try {
    const pidSource = await readFile(metric.pidPath ?? "/run/keepalived.pid", "utf8");
    const pid = Number(pidSource.trim());
    if (Number.isSafeInteger(pid) && pid > 0) {
      const signal = Number(await getJsonSignal());
      if (Number.isSafeInteger(signal) && signal > 0) {
        signalProcess(pid, signal);
        await wait();
      }
    }
  } catch {
    // Use the configured snapshot when the process cannot produce a new one.
  }
  return summarizeVrrp(await readFile(metric.path ?? "/tmp/keepalived.json", "utf8"));
}
