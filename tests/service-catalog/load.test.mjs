import { expect, jest, test } from "@jest/globals";
import loadServiceCatalog from "../../src/service-catalog/load.mjs";

const content = JSON.stringify({
  version: 1,
  components: [
    {
      id: "dns",
      name: "DNS",
      configPaths: ["etc/named.conf"],
      health: { type: "systemd", unit: "named.service" },
      action: { type: "systemd", operation: "reload", unit: "named.service" },
    },
  ],
});

test("loads an optional catalog from its repository root", () => {
  expect(loadServiceCatalog(null)).toBeNull();
  expect(loadServiceCatalog("router", () => content)).toEqual(JSON.parse(content));
  expect(
    loadServiceCatalog("router", () => {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }),
  ).toBeNull();
  expect(() => loadServiceCatalog("router", () => "version: 1\ncomponents: []")).toThrow(
    "at least one component",
  );
});

test("propagates catalog file read errors", () => {
  const readFile = jest.fn(() => {
    throw new Error("permission denied");
  });
  expect(() => loadServiceCatalog("router", readFile)).toThrow("permission denied");
});
