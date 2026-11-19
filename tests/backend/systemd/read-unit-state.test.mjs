import { expect, jest, test } from "@jest/globals";
import readSystemdUnitState from "../../../src/backend/systemd/read-unit-state.mjs";

test("reads active and inactive state from systemd", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "active\nrunning\n" });
  await expect(readSystemdUnitState("named.service", run)).resolves.toEqual({
    status: "healthy",
    state: "active (running)",
    detail: undefined,
  });
  expect(run).toHaveBeenCalledWith(
    "systemctl",
    ["show", "named.service", "--property=ActiveState", "--property=SubState", "--value"],
    { timeout: 10_000 },
  );
  run.mockResolvedValueOnce({ stdout: "failed\nfailed\n" });
  await expect(readSystemdUnitState("named.service", run)).resolves.toEqual({
    status: "unhealthy",
    state: "failed (failed)",
    detail: "Unit is failed (failed)",
  });
  run.mockResolvedValueOnce({ stdout: "active\n" });
  await expect(readSystemdUnitState("named.service", run)).resolves.toMatchObject({
    state: "active",
  });
  run.mockResolvedValueOnce({ stdout: "inactive\n" });
  await expect(readSystemdUnitState("named.service", run)).resolves.toMatchObject({
    detail: "Unit is inactive",
  });
});

test("handles the default systemd command adapter", async () => {
  await expect(readSystemdUnitState("missing.service")).resolves.toMatchObject({
    status: "unknown",
  });
});

test("reports missing states and command failures as unknown", async () => {
  await expect(
    readSystemdUnitState("named.service", jest.fn().mockResolvedValue({ stdout: "" })),
  ).resolves.toMatchObject({ status: "unknown", state: "unknown" });
  await expect(
    readSystemdUnitState(
      "named.service",
      jest.fn().mockRejectedValue(new Error("systemctl unavailable")),
    ),
  ).resolves.toMatchObject({ status: "unknown", detail: "Systemd state is unavailable" });
});
