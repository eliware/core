import { expect, jest, test } from "@jest/globals";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import acquireDeploymentLock from "../../../src/backend/deployment/lock.mjs";

jest.unstable_mockModule("node:child_process", () => ({ execFile: jest.fn() }));
const createDeploymentManager = (await import("../../../src/backend/deployment.mjs")).default;

function createFileSystem() {
  const files = new Map();
  const handles = new Map();
  let nextHandle = 1;
  return {
    files,
    openSync(path, flags) {
      if (flags === "wx" && files.has(path))
        throw Object.assign(new Error("exists"), { code: "EEXIST" });
      const handle = nextHandle++;
      files.set(path, "");
      handles.set(handle, path);
      return handle;
    },
    readFileSync(path) {
      if (!files.has(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      return files.get(path);
    },
    writeFileSync(handle, content) {
      files.set(handles.get(handle), content);
    },
    closeSync() {},
    unlinkSync(path) {
      if (!files.delete(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
    },
  };
}

function lockPath(directory, repositoryPath) {
  const key = createHash("sha256").update(resolve(repositoryPath)).digest("hex");
  return join(directory, `eliware-deployment-${key}.lock`);
}

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

test("replaces a stale process lock", () => {
  const fileSystem = createFileSystem();
  const directory = "/tmp/locks";
  const repositoryPath = "/router/repo";
  fileSystem.files.set(lockPath(directory, repositoryPath), "99999999");
  jest.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error("process is not running"), { code: "ESRCH" });
  });
  const release = acquireDeploymentLock(repositoryPath, { directory, processId: 456, fileSystem });
  expect(fileSystem.files.get(lockPath(directory, repositoryPath))).toBe("456");
  release();
  jest.restoreAllMocks();
});

test.each(["", "invalid"])("rejects an unreadable or invalid lock owner: %s", (owner) => {
  const fileSystem = createFileSystem();
  const directory = "/tmp/locks";
  const repositoryPath = "/router/repo";
  fileSystem.files.set(lockPath(directory, repositoryPath), owner);
  expect(() => acquireDeploymentLock(repositoryPath, { directory, fileSystem })).toThrow(
    "deployment lock",
  );
});

test("reports an unreadable active lock", () => {
  const fileSystem = createFileSystem();
  const directory = "/tmp/locks";
  const repositoryPath = "/router/repo";
  fileSystem.files.set(lockPath(directory, repositoryPath), "123");
  fileSystem.readFileSync = () => {
    throw new Error("read denied");
  };
  expect(() => acquireDeploymentLock(repositoryPath, { directory, fileSystem })).toThrow(
    "cannot be read",
  );
});

test("rejects a lock whose directory is missing", () => {
  const fileSystem = createFileSystem();
  fileSystem.openSync = () => {
    throw new Error("lock storage unavailable");
  };
  expect(() => acquireDeploymentLock("/router", { fileSystem })).toThrow(
    "lock storage unavailable",
  );
});

test("returns a busy or unavailable result when lock acquisition fails", () => {
  for (const [message, status] of [
    ["Another deployment process is active.", "busy"],
    ["Lock storage unavailable.", "unavailable"],
  ]) {
    const manager = createDeploymentManager({
      repositoryPath: "/router/one",
      acquireLock: () => {
        throw new Error(message);
      },
    });
    expect(manager.start("delivery")).toEqual({ accepted: false, status });
  }
});

test("does not leave manager state active when run ID creation fails", async () => {
  const createRunId = jest.fn().mockImplementationOnce(() => {
    throw new Error("random source unavailable");
  });
  const manager = createDeploymentManager({
    repositoryPath: "/router/one",
    createRunId,
    acquireLock: () => jest.fn(),
    now: () => new Date("2026-11-18T12:00:00.000Z"),
    run: async (command, args) =>
      command === "git" && args[0] === "rev-parse"
        ? { stdout: `${"a".repeat(40)}\n` }
        : { stdout: "" },
  });
  expect(manager.start("delivery")).toEqual({ accepted: false, status: "unavailable" });
  expect(manager.start("next-delivery")).toEqual({ accepted: true, runId: undefined });
  for (let attempt = 0; attempt < 20 && manager.getStatus().status !== "succeeded"; attempt += 1)
    await Promise.resolve();
  expect(manager.getStatus().status).toBe("succeeded");
});

test("records a release failure from the async setup handler", async () => {
  const manager = createDeploymentManager({
    repositoryPath: "/router/one",
    now: () => new Date("2026-11-18T12:00:00.000Z"),
    acquireLock: () => () => {
      throw "lock release failed";
    },
    notify: jest.fn().mockRejectedValue(new Error("Discord unavailable")),
    run: async (command, args) =>
      command === "git" && args[0] === "rev-parse"
        ? { stdout: `${"a".repeat(40)}\n` }
        : { stdout: "" },
  });
  manager.start("delivery");
  for (let attempt = 0; attempt < 20 && manager.getStatus().status !== "failed"; attempt += 1)
    await Promise.resolve();
  for (let attempt = 0; attempt < 20 && !manager.getStatus().notificationError; attempt += 1)
    await Promise.resolve();
  expect(manager.getStatus().error).toBe("lock release failed");
  expect(manager.getStatus().notificationError).toBe("Discord notification failed.");
});
