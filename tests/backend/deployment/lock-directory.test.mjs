import { expect, jest, test } from "@jest/globals";
import createFileSystem from "../../../test-fixtures/deployment-lock-fs.mjs";
const defaultFileSystem = createFileSystem();
jest.unstable_mockModule("node:fs", () => defaultFileSystem);
jest.unstable_mockModule("node:os", () => ({
  homedir: () => "/home/runner/router",
  tmpdir: () => "/home/runner/router/temp",
  userInfo: () => ({ username: "router-user" }),
}));
const { default: prepareLockDirectory } =
  await import("../../../src/backend/deployment/lock-directory.mjs");

test("uses default options and platform paths", () => {
  const userScope = process.getuid?.() ?? "router-user";
  expect(prepareLockDirectory().replaceAll("\\", "/")).toBe(
    `/home/runner/router/temp/eliware-core-locks-${userScope}`,
  );
  expect(defaultFileSystem.directories.size).toBe(1);
});

test("creates a private per-user directory when no directory is supplied", () => {
  const fileSystem = createFileSystem();
  const directory = prepareLockDirectory({
    fileSystem,
    userId: 1000,
    userName: "router user",
    homeDirectory: "/home/runner/router",
    tempDirectory: "/home/runner/router/temp",
  });
  expect(directory.replaceAll("\\", "/")).toBe("/home/runner/router/temp/eliware-core-locks-1000");
  expect(fileSystem.directories.has(directory)).toBe(true);
});

test("uses a sanitized user name when the platform has no user ID", () => {
  const directory = prepareLockDirectory({
    fileSystem: createFileSystem(),
    userId: null,
    userName: "router user",
    homeDirectory: "/home/runner/router",
    tempDirectory: "/home/runner/router/temp",
  });
  expect(directory).toContain("eliware-core-locks-router_user");
});

test("uses a fallback segment for an empty user name", () => {
  const directory = prepareLockDirectory({
    fileSystem: createFileSystem(),
    userId: null,
    userName: "",
    homeDirectory: "/home/runner/router",
    tempDirectory: "/home/runner/router/temp",
  });
  expect(directory).toContain("eliware-core-locks-user");
});

test("rejects private directories outside the home directory without a user ID", () => {
  expect(() =>
    prepareLockDirectory({
      fileSystem: createFileSystem(),
      directory: undefined,
      userId: null,
      userName: "router",
      homeDirectory: "/home/runner/router",
      tempDirectory: "/shared/temp",
    }),
  ).toThrow("private to the application user");
});

test.each([
  [{ uid: 2000, mode: 0o40700, isDirectory: () => true, isSymbolicLink: () => false }, 1000],
  [{ uid: 1000, mode: 0o40777, isDirectory: () => true, isSymbolicLink: () => false }, 1000],
  [{ uid: 1000, mode: 0o100600, isDirectory: () => false, isSymbolicLink: () => false }, 1000],
  [{ uid: 1000, mode: 0o120777, isDirectory: () => false, isSymbolicLink: () => true }, 1000],
])("rejects an unsafe lock directory", (info, userId) => {
  const fileSystem = createFileSystem();
  fileSystem.lstatSync = jest.fn(() => info);
  expect(() => prepareLockDirectory({ fileSystem, userId })).toThrow(
    /private to the application user|must be a real directory/u,
  );
});

test("tolerates an existing directory and reports creation errors", () => {
  const fileSystem = createFileSystem();
  const directory = "\\tmp\\eliware-core-locks-1000";
  fileSystem.directories.add(directory);
  expect(prepareLockDirectory({ fileSystem, userId: 1000, tempDirectory: "/tmp" })).toBe(directory);
  const failedFileSystem = createFileSystem();
  failedFileSystem.mkdirSync = () => {
    throw new Error("directory creation failed");
  };
  expect(() => prepareLockDirectory({ fileSystem: failedFileSystem, userId: 1000 })).toThrow(
    "directory creation failed",
  );
});

test("does not create or validate an explicitly supplied directory", () => {
  const fileSystem = createFileSystem();
  const mkdir = jest.spyOn(fileSystem, "mkdirSync");
  expect(prepareLockDirectory({ directory: "/tmp/custom", fileSystem })).toBe("/tmp/custom");
  expect(mkdir).not.toHaveBeenCalled();
});
