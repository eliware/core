import { expect, jest, test } from "@jest/globals";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import createFileSystem from "../../../test-fixtures/deployment-lock-fs.mjs";
const defaultFileSystem = createFileSystem();
jest.unstable_mockModule("node:fs", () => defaultFileSystem);
jest.unstable_mockModule("node:os", () => ({
  homedir: () => "/home/runner/router",
  tmpdir: () => "/home/runner/router/temp",
  userInfo: () => ({ username: "router-user" }),
}));
const { default: acquireDeploymentLock } = await import("../../../src/backend/deployment/lock.mjs");

function lockPath(directory, repositoryPath) {
  const key = createHash("sha256").update(resolve(repositoryPath)).digest("hex");
  return join(directory, `eliware-deployment-${key}.lock`);
}

test("uses default lock options and file storage", () => {
  const release = acquireDeploymentLock("/router/repo");
  expect(defaultFileSystem.files.size).toBe(1);
  release();
  expect(defaultFileSystem.files.size).toBe(0);
});

test("serializes processes and releases the lock once", () => {
  const fileSystem = createFileSystem();
  const directory = "/tmp/locks";
  const repositoryPath = "/router/repo";
  const lockOptions = { directory, processId: process.pid, fileSystem };
  const release = acquireDeploymentLock(repositoryPath, lockOptions);
  expect(fileSystem.files.get(lockPath(directory, repositoryPath))).toBe(String(process.pid));
  expect(() => acquireDeploymentLock(repositoryPath, lockOptions)).toThrow(
    "Another deployment process is active",
  );
  release();
  release();
  const releaseAgain = acquireDeploymentLock(repositoryPath, lockOptions);
  releaseAgain();
});

test("reports a competing process that creates a lock during stale recovery", () => {
  const fileSystem = createFileSystem();
  const path = lockPath("/tmp/locks", "/router/repo");
  fileSystem.files.set(path, "99999999");
  const openSync = fileSystem.openSync;
  let lockAttempts = 0;
  fileSystem.openSync = (target, flags, mode) => {
    if (target === path && ++lockAttempts === 2) {
      fileSystem.files.set(path, "123");
      throw Object.assign(new Error("exists"), { code: "EEXIST" });
    }
    return openSync(target, flags, mode);
  };

  expect(() =>
    acquireDeploymentLock("/router/repo", {
      directory: "/tmp/locks",
      fileSystem,
      isProcessAlive: () => false,
    }),
  ).toThrow("Another deployment process is active");
  expect(fileSystem.files.get(path)).toBe("123");
});

test("reports storage errors when recreating a recovered lock", () => {
  const fileSystem = createFileSystem();
  const path = lockPath("/tmp/locks", "/router/repo");
  fileSystem.files.set(path, "99999999");
  const openSync = fileSystem.openSync;
  let lockAttempts = 0;
  fileSystem.openSync = (target, flags, mode) => {
    if (target === path && ++lockAttempts === 2)
      throw Object.assign(new Error("lock storage unavailable"), { code: "EACCES" });
    return openSync(target, flags, mode);
  };

  expect(() =>
    acquireDeploymentLock("/router/repo", {
      directory: "/tmp/locks",
      fileSystem,
      isProcessAlive: () => false,
    }),
  ).toThrow("lock storage unavailable");
});

test("does not close an already closed descriptor when unlink retry succeeds", () => {
  const fileSystem = createFileSystem();
  const closeSync = jest.spyOn(fileSystem, "closeSync");
  const unlinkSync = fileSystem.unlinkSync;
  let fail = true;
  fileSystem.unlinkSync = (path) => {
    if (fail) {
      fail = false;
      throw new Error("unlink failed");
    }
    unlinkSync(path);
  };
  const release = acquireDeploymentLock("/router/repo", {
    directory: "/tmp/locks",
    fileSystem,
  });
  expect(release).toThrow("unlink failed");
  expect(release).not.toThrow();
  expect(closeSync).toHaveBeenCalledTimes(1);
});

test("rejects a lock whose directory is missing", () => {
  const fileSystem = createFileSystem();
  fileSystem.openSync = () => {
    throw new Error("lock storage unavailable");
  };
  expect(() =>
    acquireDeploymentLock("/router", {
      fileSystem,
      userId: null,
      homeDirectory: "/router/home",
      tempDirectory: "/router/home/temp",
    }),
  ).toThrow("lock storage unavailable");
});

test("removes a new lock when writing its owner fails", () => {
  const fileSystem = createFileSystem();
  const path = lockPath("/tmp/locks", "/router/repo");
  const closeSync = jest.spyOn(fileSystem, "closeSync");
  fileSystem.writeFileSync = () => {
    throw new Error("write failed");
  };

  expect(() =>
    acquireDeploymentLock("/router/repo", { directory: "/tmp/locks", fileSystem }),
  ).toThrow("write failed");
  expect(closeSync).toHaveBeenCalledTimes(1);
  expect(fileSystem.files.has(path)).toBe(false);
});
