import { expect, jest, test } from "@jest/globals";
import recoverStaleLock from "../../../src/backend/deployment/stale-lock.mjs";

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
    closeSync() {},
    unlinkSync(path) {
      if (!files.delete(path)) throw Object.assign(new Error("missing"), { code: "ENOENT" });
    },
  };
}

function recover(fileSystem, isProcessAlive) {
  return recoverStaleLock(
    "/tmp/deployment.lock",
    "/tmp/deployment.lock.recovery",
    fileSystem,
    isProcessAlive,
  );
}

test("removes a lock owned by a process that no longer exists", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "99999999");
  jest.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error("process is not running"), { code: "ESRCH" });
  });

  expect(recover(fileSystem)).toBeUndefined();
  expect(fileSystem.files.has("/tmp/deployment.lock")).toBe(false);
  expect(fileSystem.files.has("/tmp/deployment.lock.recovery")).toBe(false);
  jest.restoreAllMocks();
});

test("keeps a lock owned by an active process", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "123");

  expect(() => recover(fileSystem, () => true)).toThrow("Another deployment process is active");
  expect(fileSystem.files.get("/tmp/deployment.lock")).toBe("123");
});

test("treats process permission errors as an active owner", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "123");
  jest.spyOn(process, "kill").mockImplementation(() => {
    throw Object.assign(new Error("permission denied"), { code: "EPERM" });
  });

  expect(() => recover(fileSystem)).toThrow("Another deployment process is active");
  jest.restoreAllMocks();
});

test.each(["", "invalid"])("rejects invalid lock owner data: %s", (owner) => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", owner);

  expect(() => recover(fileSystem, () => false)).toThrow("deployment lock has invalid data");
});

test("reports an unreadable lock owner", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "123");
  fileSystem.readFileSync = () => {
    throw new Error("read denied");
  };

  expect(() => recover(fileSystem)).toThrow("deployment lock exists and cannot be read");
});

test("does not recover a stale lock while another process holds the recovery guard", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "99999999");
  fileSystem.files.set("/tmp/deployment.lock.recovery", "456");

  expect(() => recover(fileSystem, () => false)).toThrow("recovering a stale lock");
  expect(fileSystem.files.get("/tmp/deployment.lock")).toBe("99999999");
});

test("reports recovery guard storage errors", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "99999999");
  const openSync = fileSystem.openSync;
  fileSystem.openSync = (path, flags, mode) => {
    if (path.endsWith(".recovery")) throw new Error("recovery storage unavailable");
    return openSync(path, flags, mode);
  };

  expect(() => recover(fileSystem, () => false)).toThrow("recovery storage unavailable");
});

test("keeps a lock when its owner changes during stale recovery", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "99999999");
  const readFileSync = fileSystem.readFileSync;
  let reads = 0;
  fileSystem.readFileSync = (path) => {
    reads += 1;
    if (reads === 2) fileSystem.files.set(path, "456");
    return readFileSync(path);
  };

  expect(() => recover(fileSystem, () => false)).toThrow("Another deployment process is active");
  expect(fileSystem.files.get("/tmp/deployment.lock")).toBe("456");
  expect(fileSystem.files.has("/tmp/deployment.lock.recovery")).toBe(false);
});

test("keeps a lock if its owner becomes active during recovery", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "123");
  let checks = 0;

  expect(() => recover(fileSystem, () => ++checks > 1)).toThrow(
    "Another deployment process is active",
  );
  expect(fileSystem.files.get("/tmp/deployment.lock")).toBe("123");
});

test("removes the recovery guard when closing its descriptor fails", () => {
  const fileSystem = createFileSystem();
  fileSystem.files.set("/tmp/deployment.lock", "99999999");
  fileSystem.closeSync = () => {
    throw new Error("close failed");
  };

  expect(() => recover(fileSystem, () => false)).toThrow("close failed");
  expect(fileSystem.files.has("/tmp/deployment.lock.recovery")).toBe(false);
});
