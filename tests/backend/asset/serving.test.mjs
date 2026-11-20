import { expect, jest, test } from "@jest/globals";
import { resolve } from "node:path";
import readRouteAsset from "../../../src/backend/asset/serving.mjs";

const resolvePath = async (file) => resolve(file);

function createHandle(content = "asset") {
  return {
    stat: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
    readFile: jest.fn().mockResolvedValue(content),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

test.each([
  ["public", { root: "public", file: "index.html" }, "public", "index.html"],
  ["public client", { root: "public", file: "client.bundle" }, "public", "client.bundle"],
])("reads a route asset from the %s root", async (_name, route, rootName, file) => {
  const handle = createHandle();
  const openFile = jest.fn().mockResolvedValue(handle);

  await expect(
    readRouteAsset(route, {
      publicRoot: "public",
      buildRoot: "dist",
      openFile,
      statPath: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
      resolvePath,
    }),
  ).resolves.toBe("asset");
  expect(openFile).toHaveBeenCalledWith(resolve(rootName, file), "r");
  expect(handle.close).toHaveBeenCalledTimes(1);
});

test("uses the file system resolver for missing assets", async () => {
  await expect(
    readRouteAsset(
      { root: "public", file: "missing-file.html" },
      { publicRoot: "missing-root", buildRoot: "dist" },
    ),
  ).resolves.toBeNull();
});

test("propagates asset open errors other than missing files", async () => {
  const error = new Error("permission denied");
  const openFile = jest.fn().mockRejectedValue(error);

  await expect(
    readRouteAsset(
      { root: "public", file: "index.html" },
      { publicRoot: "public", buildRoot: "dist", openFile, resolvePath },
    ),
  ).rejects.toBe(error);
});

test("rejects an asset that resolves outside its root after opening", async () => {
  const handle = createHandle();
  const openFile = jest.fn().mockResolvedValue(handle);
  let assetResolutions = 0;
  const resolvePathWithSwap = async (file) => {
    if (file === resolve("public/index.html") && ++assetResolutions === 2)
      return resolve("private/secret.txt");
    return resolve(file);
  };

  await expect(
    readRouteAsset(
      { root: "public", file: "index.html" },
      {
        publicRoot: "public",
        buildRoot: "dist",
        openFile,
        statPath: jest.fn().mockResolvedValue({ dev: 1, ino: 2 }),
        resolvePath: resolvePathWithSwap,
      },
    ),
  ).rejects.toThrow("asset path must stay within its configured root");
  expect(handle.readFile).not.toHaveBeenCalled();
  expect(handle.close).toHaveBeenCalledTimes(1);
});

test("returns no asset for a missing route", async () => {
  const openFile = jest.fn();

  await expect(
    readRouteAsset(null, { publicRoot: "public", buildRoot: "dist", openFile }),
  ).resolves.toBeNull();
  expect(openFile).not.toHaveBeenCalled();
});

test.each(["", ".", "nested/.."])(
  "returns no asset for a route that names its root: %s",
  async (file) => {
    const openFile = jest.fn();
    await expect(
      readRouteAsset(
        { root: "public", file },
        { publicRoot: "public", buildRoot: "dist", openFile, resolvePath },
      ),
    ).resolves.toBeNull();
    expect(openFile).not.toHaveBeenCalled();
  },
);

test.each([[{ root: "unknown", file: "asset.txt" }], [{ root: "public" }]])(
  "rejects incomplete asset route metadata: %p",
  async (route) => {
    await expect(
      readRouteAsset(route, { publicRoot: "public", buildRoot: "dist", openFile: jest.fn() }),
    ).rejects.toThrow("asset route must include a configured root and file");
  },
);
