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

test("returns no asset for a missing route", async () => {
  const read = jest.fn();

  await expect(
    readRouteAsset(null, { publicRoot: "public", buildRoot: "dist", read }),
  ).resolves.toBeNull();
  expect(read).not.toHaveBeenCalled();
});

test("rejects route files outside their configured asset root", async () => {
  const read = jest.fn();

  await expect(
    readRouteAsset(
      { root: "public", file: "../../private/secret.txt" },
      { publicRoot: "public", buildRoot: "dist", read },
    ),
  ).rejects.toThrow("asset path must stay within its configured root");
  expect(read).not.toHaveBeenCalled();
});

test.each([[{ root: "unknown", file: "asset.txt" }], [{ root: "public" }]])(
  "rejects incomplete asset route metadata: %p",
  async (route) => {
    await expect(
      readRouteAsset(route, { publicRoot: "public", buildRoot: "dist", read: jest.fn() }),
    ).rejects.toThrow("asset route must include a configured root and file");
  },
);

test("rejects symlinks that resolve outside the configured asset root", async () => {
  const root = resolve("public");
  const outside = resolve("private/secret.txt");
  const read = jest.fn();
  const resolvePathMock = jest.fn(async (file) =>
    file === resolve(root, "leak.txt") ? outside : file,
  );
  await expect(
    readRouteAsset(
      { root: "public", file: "leak.txt" },
      { publicRoot: root, buildRoot: "dist", read, resolvePath: resolvePathMock },
    ),
  ).rejects.toThrow("asset path must stay within its configured root");
  expect(read).not.toHaveBeenCalled();
});
