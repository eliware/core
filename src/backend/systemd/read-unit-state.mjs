import { execFile as nodeExecFile } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(nodeExecFile);

export default async function readSystemdUnitState(unit, run = execFile) {
  try {
    const { stdout } = await run(
      "systemctl",
      ["show", unit, "--property=ActiveState", "--property=SubState", "--value"],
      { timeout: 10_000 },
    );
    const [activeState, subState] = String(stdout).trim().split(/\r?\n/u);
    if (!activeState)
      return { status: "unknown", state: "unknown", detail: "Systemd state is unavailable" };
    return {
      status: activeState === "active" ? "healthy" : "unhealthy",
      state: subState ? `${activeState} (${subState})` : activeState,
      detail:
        activeState === "active"
          ? undefined
          : `Unit is ${activeState}${subState ? ` (${subState})` : ""}`,
    };
  } catch {
    return { status: "unknown", state: "unknown", detail: "Systemd state is unavailable" };
  }
}
