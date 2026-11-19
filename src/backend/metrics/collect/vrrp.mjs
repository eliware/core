import summarizeVrrp from "../vrrp.mjs";

export default async function collectVrrp(metric, { readFile, signalProcess, wait }) {
  const pidSource = await readFile(metric.pidPath ?? "/run/keepalived_vrrp.pid", "utf8");
  const pid = Number(pidSource.trim());
  if (!Number.isSafeInteger(pid) || pid < 1)
    throw new Error("Keepalived VRRP process ID is invalid");
  signalProcess(pid, "SIGUSR1");
  await wait();
  return summarizeVrrp(await readFile(metric.path ?? "/tmp/keepalived.json", "utf8"));
}
