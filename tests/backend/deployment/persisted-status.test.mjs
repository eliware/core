import { expect, test } from "@jest/globals";
import { join } from "node:path";
import createPersistedStatus from "../../../src/backend/deployment/persisted-status.mjs";

test("loads and saves deployment status under Git metadata", () => {
  const files = new Map([
    [
      join("/router", ".git", "eliware-core-deployment-status.json"),
      JSON.stringify({ status: "running" }),
    ],
  ]);
  const fileSystem = {
    existsSync: (path) => path === join("/router", ".git"),
    readFileSync: (path) => files.get(path),
    writeFileSync: (path, value) => files.set(path, value),
  };
  const persisted = createPersistedStatus("/router", fileSystem);
  expect(persisted.load()).toEqual({ status: "running" });
  persisted.save({ status: "succeeded" });
  expect(persisted.load()).toEqual({ status: "succeeded" });
});

test("skips state writes when the repository has no Git metadata directory", () => {
  const fileSystem = {
    existsSync: () => false,
    readFileSync: () => {
      throw new Error("missing");
    },
    writeFileSync: () => {
      throw new Error("unexpected write");
    },
  };
  const persisted = createPersistedStatus("/router", fileSystem);
  expect(persisted.load()).toBeUndefined();
  expect(() => persisted.save({ status: "running" })).not.toThrow();
});

test("returns no status when persisted JSON cannot be parsed", () => {
  const fileSystem = {
    existsSync: () => true,
    readFileSync: () => "{",
    writeFileSync: () => {},
  };
  expect(createPersistedStatus("/router", fileSystem).load()).toBeUndefined();
});

test("ignores an unavailable repository path", () => {
  const persisted = createPersistedStatus(undefined, {});
  expect(persisted.load()).toBeUndefined();
  expect(() => persisted.save({ status: "running" })).not.toThrow();
});
