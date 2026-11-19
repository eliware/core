import { expect, jest, test } from "@jest/globals";
import { resolve } from "node:path";
import readRepositoryFile from "../../src/preflight-config/read-repository-file.mjs";

test("reads a repository file after checking its real path", () => {
  const root = resolve("C:/router");
  const file = resolve(root, "etc/named.conf");
  const readFile = jest.fn(() => "config");

  expect(readRepositoryFile(root, "etc/named.conf", readFile, () => root)).toBe("config");
  expect(readFile).toHaveBeenCalledWith(file, "utf8");
});

test("uses the real filesystem reader by default", () => {
  expect(readRepositoryFile(process.cwd(), "README.md")).toContain("@eliware/core");
});

test("rejects a symlink target outside the repository", () => {
  const root = resolve("C:/router");
  const readFile = jest.fn();
  const realPath = (path) => (path === root ? root : resolve("C:/private/secret"));

  expect(() => readRepositoryFile(root, "etc/named.conf", readFile, realPath)).toThrow(
    "outside the configuration repository",
  );
  expect(readFile).not.toHaveBeenCalled();
});

test("rejects a missing file below a symlink outside the repository", () => {
  const root = resolve("C:/router");
  const outside = resolve("C:/private");
  const readFile = jest.fn();
  const realPath = (path) => {
    if (path === root) return root;
    if (path === resolve(root, "link")) return outside;
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  };

  expect(() => readRepositoryFile(root, "link/missing.conf", readFile, realPath)).toThrow(
    "outside the configuration repository",
  );
  expect(readFile).not.toHaveBeenCalled();
});

test("rejects lexical traversal outside the repository", () => {
  expect(() => readRepositoryFile("C:/router", "../private/secret", jest.fn())).toThrow(
    "outside the configuration repository",
  );
});

test("uses an injected reader when a file is missing from disk", () => {
  const root = resolve("C:/virtual-router");
  const readFile = jest.fn(() => "virtual config");
  const realPath = (path) => {
    if (path === root) return root;
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  };

  expect(readRepositoryFile(root, "etc/named.conf", readFile, realPath)).toBe("virtual config");
  expect(readFile).toHaveBeenCalledWith(resolve(root, "etc/named.conf"), "utf8");
});

test("propagates other real path errors", () => {
  const root = resolve("C:/router");
  const realPath = (path) => {
    if (path === root) return root;
    throw Object.assign(new Error("access denied"), { code: "EACCES" });
  };

  expect(() => readRepositoryFile(root, "etc/named.conf", jest.fn(), realPath)).toThrow(
    "access denied",
  );
});

test("propagates errors while resolving the repository root", () => {
  const realPath = () => {
    throw Object.assign(new Error("access denied"), { code: "EACCES" });
  };

  expect(() => readRepositoryFile("C:/router", "etc/named.conf", jest.fn(), realPath)).toThrow(
    "access denied",
  );
});
