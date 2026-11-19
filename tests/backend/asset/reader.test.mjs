import { expect, jest, test } from "@jest/globals";
import { resolve } from "node:path";

const defaultHandle = {
  stat: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
  readFile: jest.fn().mockResolvedValue(Buffer.from("asset")),
  close: jest.fn().mockResolvedValue(undefined),
};
const defaultOpen = jest.fn().mockResolvedValue(defaultHandle);
const defaultRealpath = jest.fn();
const defaultStat = jest.fn().mockResolvedValue({ dev: 1, ino: 2 });
jest.unstable_mockModule("node:fs/promises", () => ({
  open: defaultOpen,
  realpath: defaultRealpath,
  stat: defaultStat,
}));
const { default: readAsset } = await import("../../../src/backend/asset/reader.mjs");

const assetRoot = resolve("public");
const assetPath = resolve(assetRoot, "index.html");

test("uses the default filesystem helpers", async () => {
  defaultRealpath.mockResolvedValue(assetPath);
  await expect(
    readAsset({ assetRoot, assetPath, realAsset: assetPath }, {}),
  ).resolves.toBeInstanceOf(Buffer);
  expect(defaultOpen).toHaveBeenCalledWith(assetPath, "r");
  expect(defaultRealpath).toHaveBeenCalledWith(assetPath);
  expect(defaultStat).toHaveBeenCalledWith(assetPath);
  expect(defaultHandle.close).toHaveBeenCalledTimes(1);
});

function createHandle(content = "asset") {
  return {
    stat: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
    readFile: jest.fn().mockResolvedValue(content),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

test("reads content from the checked file handle", async () => {
  const handle = createHandle();
  const openFile = jest.fn().mockResolvedValue(handle);

  await expect(
    readAsset(
      { assetRoot, assetPath, realAsset: assetPath },
      {
        openFile,
        resolvePath: jest.fn().mockResolvedValue(assetPath),
        statPath: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
      },
    ),
  ).resolves.toBe("asset");
  expect(openFile).toHaveBeenCalledWith(assetPath, "r");
  expect(handle.close).toHaveBeenCalledTimes(1);
});

test("returns a missing result when the file does not exist", async () => {
  const error = Object.assign(new Error("missing"), { code: "ENOENT" });

  await expect(
    readAsset(
      { assetRoot, assetPath, realAsset: assetPath },
      { openFile: jest.fn().mockRejectedValue(error) },
    ),
  ).resolves.toBeNull();
});

test("propagates filesystem errors other than missing files", async () => {
  const error = Object.assign(new Error("permission denied"), { code: "EACCES" });

  await expect(
    readAsset(
      { assetRoot, assetPath, realAsset: assetPath },
      { openFile: jest.fn().mockRejectedValue(error) },
    ),
  ).rejects.toBe(error);
});

test("rejects a file handle that does not match the checked path", async () => {
  const handle = createHandle();

  await expect(
    readAsset(
      { assetRoot, assetPath, realAsset: assetPath },
      {
        openFile: jest.fn().mockResolvedValue(handle),
        resolvePath: jest.fn().mockResolvedValue(assetPath),
        statPath: jest.fn().mockResolvedValue({ dev: 9, ino: 10 }),
      },
    ),
  ).rejects.toThrow("asset changed while it was being read");
  expect(handle.readFile).not.toHaveBeenCalled();
  expect(handle.close).toHaveBeenCalledTimes(1);
});

test("closes the file handle when reading fails", async () => {
  const error = new Error("read failed");
  const handle = createHandle();
  handle.readFile.mockRejectedValue(error);

  await expect(
    readAsset(
      { assetRoot, assetPath, realAsset: assetPath },
      {
        openFile: jest.fn().mockResolvedValue(handle),
        resolvePath: jest.fn().mockResolvedValue(assetPath),
        statPath: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
      },
    ),
  ).rejects.toBe(error);
  expect(handle.close).toHaveBeenCalledTimes(1);
});
