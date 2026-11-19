import { expect, test } from "@jest/globals";
import formatSteps from "../../../../src/backend/deployment/notification/steps.mjs";

test("reports when no public deployment steps exist", () => {
  expect(formatSteps([])).toBe("No deployment steps were recorded.");
  expect(formatSteps([{ internal: true, name: "git status" }])).toBe(
    "No deployment steps were recorded.",
  );
});

test("formats step states, fallback names, and escaped details", () => {
  expect(
    formatSteps([
      { name: "install", status: "passed" },
      { name: "npm test", status: "failed", detail: "@here **failed**" },
      { status: "running" },
      { name: "git status", internal: true, status: "passed" },
    ]),
  ).toBe("✅ install\n❌ npm test: @\u200bhere \\*\\*failed\\*\\*\n⏳ Unknown step");
});
