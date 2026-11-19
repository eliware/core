import { expect, test } from "@jest/globals";
import { join } from "node:path";
import readCoreVersion from "../../../../src/backend/deployment/core/version.mjs";

test("reads the installed Core package version", async () => {
  const readMetadata = async (path, encoding) => {
    expect(path).toBe(join("/router", "node_modules", "@eliware", "core", "package.json"));
    expect(encoding).toBe("utf8");
    return JSON.stringify({ name: "@eliware/core", version: "15.2.3" });
  };
  await expect(readCoreVersion("/router", readMetadata)).resolves.toBe("15.2.3");
});

test("returns null when Core is not installed", async () => {
  const readMetadata = async () => {
    throw Object.assign(new Error("missing"), { code: "ENOENT" });
  };
  await expect(readCoreVersion("/router", readMetadata)).resolves.toBeNull();
});

test("uses the filesystem reader by default", async () => {
  await expect(readCoreVersion("/missing-core-repository")).resolves.toBeNull();
});

test("rejects malformed installed package metadata", async () => {
  await expect(readCoreVersion("/router", async () => "{")).rejects.toThrow(
    "Could not read the installed Core package version",
  );
});

test("returns null when installed metadata does not identify Core", async () => {
  await expect(
    readCoreVersion("/router", async () => JSON.stringify({ name: "other", version: 5 })),
  ).resolves.toBeNull();
});
