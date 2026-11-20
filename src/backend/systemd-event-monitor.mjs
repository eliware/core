import { spawn as nodeSpawn } from "node:child_process";
import { createInterface } from "node:readline";
import parseJournalEvent from "./systemd/journal-event.mjs";

export default function createSystemdEventMonitor({
  units = [],
  onEvent = async () => {},
  spawn = nodeSpawn,
  log = { warn: () => {} },
  lineReader = createInterface,
  now = () => new Date(),
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  restartDelayMs = 1000,
} = {}) {
  const uniqueUnits = [...new Set(units)];
  const states = new Map(uniqueUnits.map((unit) => [unit, { stopped: false, failed: false }]));
  let child;
  let reader;
  let stopped = true;
  let restartTimer;
  let deliveryQueue = Promise.resolve();

  function handleLine(line) {
    const parsed = parseJournalEvent(line, uniqueUnits, now);
    if (!parsed) return;
    const state = states.get(parsed.name);
    if (parsed.event === "failed") {
      if (state.failed) return;
      state.failed = true;
      state.stopped = true;
      void deliver(parsed);
      return;
    } else if (parsed.event === "stopped") {
      if (state.stopped || state.failed) return;
      state.stopped = true;
      void deliver({ ...parsed, event: "stopped" });
      return;
    } else {
      const restarted = state.stopped || state.failed;
      state.stopped = false;
      state.failed = false;
      if (!restarted) return;
      parsed.event = "restarted";
    }
    void deliver(parsed);
  }

  function deliver(event) {
    deliveryQueue = deliveryQueue.then(async () => {
      try {
        await onEvent(event);
      } catch {
        log.warn(`Systemd event handling failed for ${event.name}`);
      }
    });
  }

  function scheduleRestart(message, failedChild) {
    if (stopped || (failedChild && child !== failedChild)) return;
    log.warn(message);
    const active = child;
    child = undefined;
    reader?.close();
    reader = undefined;
    if (active && !active.killed) {
      try {
        active.kill("SIGTERM");
      } catch {}
    }
    restartTimer = setTimeoutFn(() => {
      restartTimer = undefined;
      if (!stopped) launchStream();
    }, restartDelayMs);
    restartTimer.unref?.();
  }

  function launchStream() {
    const args = ["--follow", "--output=json", "--no-pager", "--lines=0"];
    for (const unit of uniqueUnits) args.push("--unit", unit);
    try {
      const active = spawn("journalctl", args, { stdio: ["ignore", "pipe", "pipe"] });
      child = active;
      reader = lineReader({ input: active.stdout, crlfDelay: Infinity });
      reader.on("line", handleLine);
      active.on("error", () => scheduleRestart("Systemd event stream is unavailable", active));
      active.on("close", () => scheduleRestart("Systemd event stream stopped", active));
    } catch {
      scheduleRestart("Systemd event stream could not start");
    }
  }

  function start() {
    if (!stopped || uniqueUnits.length === 0) return;
    stopped = false;
    launchStream();
  }

  async function stop() {
    if (stopped) return;
    stopped = true;
    if (restartTimer !== undefined) clearTimeoutFn(restartTimer);
    restartTimer = undefined;
    reader?.close();
    const active = child;
    child = undefined;
    reader = undefined;
    if (active && !active.killed) active.kill("SIGTERM");
  }

  return { start, stop };
}
