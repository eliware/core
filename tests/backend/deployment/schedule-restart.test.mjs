import { expect, jest, test } from "@jest/globals";
import { basename } from "node:path";
import scheduleCoreRestart from "../../../src/backend/deployment/schedule-restart.mjs";

test("starts a detached systemd worker with restart recovery context", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "" });
  const status = { status: "running", steps: [] };
  await scheduleCoreRestart({
    run,
    runId: "123456",
    repositoryPath: "/eliware/router",
    previousCommit: "a".repeat(40),
    catalogActions: [],
    status,
    serviceUnit: "core.service",
    port: 9300,
  });
  const [command, args] = run.mock.calls[0];
  expect(command).toBe("systemd-run");
  expect(args).toEqual(
    expect.arrayContaining([
      "--unit=eliware-core-restart-123456",
      expect.stringContaining("core-restart-worker.mjs"),
    ]),
  );
  expect(basename(args.at(-2))).toBe("core-restart-worker.mjs");
  const payload = JSON.parse(Buffer.from(args.at(-1), "base64url").toString("utf8"));
  expect(payload).toMatchObject({
    repositoryPath: "/eliware/router",
    serviceUnit: "core.service",
    port: 9300,
    status,
  });
});
