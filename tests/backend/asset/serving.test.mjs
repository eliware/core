import { expect, jest, test } from "@jest/globals";
import { resolve } from "node:path";
import readRouteAsset from "../../../src/backend/asset/serving.mjs";

const resolvePath = async (file) => resolve(file);

test.each([
  ["public", { root: "public", file: "index.html" }, "public", "index.html"],
  ["build", { root: "build", file: "client.js" }, "dist", "client.js"],
])("reads a route asset from the %s root", async (_name, route, rootName, file) => {
  const read = jest.fn().mockResolvedValue("asset");

  await expect(
    readRouteAsset(route, { publicRoot: "public", buildRoot: "dist", read, resolvePath }),
  ).resolves.toBe("asset");
  expect(read).toHaveBeenCalledWith(resolve(rootName, file));
});

test("uses the file system reader by default", async () => {
  await expect(
    readRouteAsset(
      { root: "public", file: "missing-file.html" },
      { publicRoot: "missing-root", buildRoot: "dist" },
    ),
  ).resolves.toBeNull();
});

test("propagates asset read errors other than missing files", async () => {
  const read = jest.fn().mockRejectedValue(new Error("permission denied"));

  await expect(
    readRouteAsset(
      { root: "public", file: "index.html" },
      { publicRoot: "public", buildRoot: "dist", read, resolvePath },
    ),
  ).rejects.toThrow("permission denied");
});

test("returns no asset for a missing route", async () => {
  const read = jest.fn();

  await expect(
    readRouteAsset(null, { publicRoot: "public", buildRoot: "dist", read }),
  ).resolves.toBeNull();
  expect(read).not.toHaveBeenCalled();
});

test.each(["", ".", "nested/.."])(
  "returns no asset for a route that names its root: %s",
  async (file) => {
    const read = jest.fn();
    await expect(
      readRouteAsset(
        { root: "public", file },
        { publicRoot: "public", buildRoot: "dist", read, resolvePath },
      ),
    ).resolves.toBeNull();
    expect(read).not.toHaveBeenCalled();
  },
);

test.each([[{ root: "unknown", file: "asset.txt" }], [{ root: "public" }]])(
  "rejects incomplete asset route metadata: %p",
  async (route) => {
    await expect(
      readRouteAsset(route, { publicRoot: "public", buildRoot: "dist", read: jest.fn() }),
    ).rejects.toThrow("asset route must include a configured root and file");
  },
);
