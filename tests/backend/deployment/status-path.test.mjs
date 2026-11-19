import { expect, test } from "@jest/globals";
import { join } from "node:path";
import getPersistedStatusPaths from "../../../src/backend/deployment/status-path.mjs";

test("builds paths for persisted status and Git metadata", () => {
  expect(getPersistedStatusPaths("/router")).toEqual({
    gitPath: join("/router", ".git"),
    statusPath: join("/router", ".git", "eliware-core-deployment-status.json"),
  });
});

test("returns no paths when the repository path is absent", () => {
  expect(getPersistedStatusPaths(undefined)).toBeUndefined();
});
