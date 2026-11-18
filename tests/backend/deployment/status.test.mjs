import { expect, test } from "@jest/globals";
import createDeploymentStatus from "../../../src/backend/deployment/status.mjs";

test("starts with an empty status when no initial value is supplied", () => {
  expect(createDeploymentStatus().get()).toEqual({});
});

test("returns independent snapshots and replaces status", () => {
  const status = createDeploymentStatus({ status: "idle", steps: [] });
  const snapshot = status.get();
  snapshot.steps.push({ name: "mutated" });
  expect(status.get()).toEqual({ status: "idle", steps: [] });
  status.set({ status: "running", steps: [{ name: "npm test" }] });
  expect(status.get()).toEqual({ status: "running", steps: [{ name: "npm test" }] });
});

test("merges status updates without exposing nested references", () => {
  const status = createDeploymentStatus({ status: "running", steps: [] });
  status.update({ currentStep: "npm test", steps: [{ name: "npm ci" }] });
  const snapshot = status.get();
  snapshot.steps[0].name = "changed";
  expect(status.get()).toEqual({
    status: "running",
    currentStep: "npm test",
    steps: [{ name: "npm ci" }],
  });
});

test("uses a fallback timestamp when the clock fails", () => {
  const status = createDeploymentStatus();
  expect(status.timestamp(() => "time", "fallback")).toBe("time");
  expect(
    status.timestamp(() => {
      throw new Error("clock unavailable");
    }, "fallback"),
  ).toBe("fallback");
  expect(
    status.timestamp(() => {
      throw new Error("clock unavailable");
    }),
  ).toBeNull();
});
