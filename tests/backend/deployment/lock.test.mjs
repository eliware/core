import { expect, jest, test } from "@jest/globals";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import acquireDeploymentLock from "../../../src/backend/deployment/lock.mjs";

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

test.each(["close", "unlink"])(
  "retries a failed %s operation when releasing a lock",
  (operation) => {
    const fileSystem = createFileSystem();
    const path = lockPath("/tmp/locks", "/router/repo");
    const closeSync = fileSystem.closeSync;
    const unlinkSync = fileSystem.unlinkSync;
    let failures = 1;
    let closeCount = 0;
    fileSystem.closeSync = (descriptor) => {
      closeCount += 1;
      if (operation === "close" && failures-- > 0) throw new Error("close failed");
      closeSync(descriptor);
    };
    fileSystem.unlinkSync = (target) => {
      if (operation === "unlink" && failures-- > 0) throw new Error("unlink failed");
      unlinkSync(target);
    };
    const release = acquireDeploymentLock("/router/repo", { directory: "/tmp/locks", fileSystem });

    expect(release).toThrow(`${operation} failed`);
    expect(fileSystem.files.has(path)).toBe(true);
    expect(release).not.toThrow();
    expect(fileSystem.files.has(path)).toBe(false);
    if (operation === "unlink") expect(closeCount).toBe(1);
    release();
  },
);

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

test("rejects a lock whose directory is missing", () => {
  const fileSystem = createFileSystem();
  fileSystem.openSync = () => {
    throw new Error("lock storage unavailable");
  };
  expect(() => acquireDeploymentLock("/router", { fileSystem })).toThrow(
    "lock storage unavailable",
  );
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
