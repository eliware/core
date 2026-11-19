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
} = {}) {
  const uniqueUnits = [...new Set(units)];
  const states = new Map(uniqueUnits.map((unit) => [unit, { stopped: false, failed: false }]));
  let child;
  let reader;
  let stopped = true;

  function handleLine(line) {
    const parsed = parseJournalEvent(line, uniqueUnits, now);
    if (!parsed) return;
    const state = states.get(parsed.name);
    if (parsed.event === "failed") {
      if (state.failed) return;
      state.failed = true;
      state.stopped = true;
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

  async function deliver(event) {
    try {
      await onEvent(event);
    } catch {
      log.warn(`Systemd event handling failed for ${event.name}`);
    }
  }

  function start() {
    if (!stopped || uniqueUnits.length === 0) return;
    stopped = false;
    const args = ["--follow", "--output=json", "--no-pager", "--lines=0"];
    for (const unit of uniqueUnits) args.push("--unit", unit);
    try {
      child = spawn("journalctl", args, { stdio: ["ignore", "pipe", "pipe"] });
      reader = lineReader({ input: child.stdout, crlfDelay: Infinity });
      reader.on("line", handleLine);
      child.on("error", () => {
        if (!stopped) log.warn("Systemd event stream is unavailable");
      });
      child.on("close", () => {
        if (!stopped) log.warn("Systemd event stream stopped");
      });
    } catch {
      log.warn("Systemd event stream could not start");
    }
  }

  async function stop() {
    if (stopped) return;
    stopped = true;
    reader?.close();
    const active = child;
    child = undefined;
    reader = undefined;
    if (active && !active.killed) active.kill("SIGTERM");
  }

  return { start, stop };
}
