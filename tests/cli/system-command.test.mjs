import { expect, jest, test } from "@jest/globals";

let failure;
const execFile = jest.fn((command, args, callback) => {
  if (failure) callback(failure);
  else callback(null, `${command} ${args.join(" ")}`, "");
});
jest.unstable_mockModule("node:child_process", () => ({ execFile }));
const runSystemCommand = (await import("../../src/cli/system-command.mjs")).default;

test("runs a command and returns its output", async () => {
  failure = undefined;
  await expect(runSystemCommand("systemctl", ["is-active", "named.service"])).resolves.toBe(
    "systemctl is-active named.service",
  );
});

test("rejects when the command fails", async () => {
  failure = new Error("systemctl failed");
  await expect(runSystemCommand("systemctl", ["reload", "named.service"])).rejects.toThrow(
    "systemctl failed",
  );
});
