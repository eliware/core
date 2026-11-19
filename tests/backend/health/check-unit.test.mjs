import { expect, jest, test } from "@jest/globals";
import checkHealthUnit from "../../../src/backend/health/check-unit.mjs";

const now = () => new Date("2026-11-18T12:00:00.000Z");

test("maps a passing unit check to healthy status", async () => {
  await expect(checkHealthUnit("named.service", jest.fn(), now)).resolves.toEqual({
    name: "named.service",
    status: "healthy",
    checkedAt: "2026-11-18T12:00:00.000Z",
  });
});

test("maps missing systemctl and inactive units to useful details", async () => {
  await expect(
    checkHealthUnit("named.service", jest.fn().mockRejectedValue({ code: "ENOENT" }), now),
  ).resolves.toMatchObject({ status: "unhealthy", detail: "systemctl is unavailable" });
  await expect(
    checkHealthUnit("named.service", jest.fn().mockRejectedValue(new Error("inactive")), now),
  ).resolves.toMatchObject({ status: "unhealthy", detail: "Unit is not active" });
});

test("marks a unit unhealthy when its supplied check exceeds the timeout", async () => {
  await expect(
    checkHealthUnit("named.service", () => new Promise(() => {}), now, 1),
  ).resolves.toMatchObject({ status: "unhealthy", detail: "Unit check timed out" });
});
