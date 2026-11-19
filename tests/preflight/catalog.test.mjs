import { expect, test } from "@jest/globals";
import validateRepositoryCatalog from "../../src/preflight/catalog.mjs";

const catalog = {
  version: 1,
  components: [
    {
      id: "dns",
      name: "DNS",
      configPaths: ["etc/**", "var/**", "scripts/**"],
      health: { type: "systemd", unit: "named.service" },
      action: { type: "systemd", operation: "reload", unit: "named.service" },
    },
  ],
};

test("reports valid catalog entries and accepts mapped paths", () => {
  expect(
    validateRepositoryCatalog("core-catalog.yaml", catalog, [
      "etc/kea/kea-dhcp4.conf",
      "var/named/db.example",
      "README.md",
    ]),
  ).toEqual({ errors: [], lines: ["PASS service catalog, entries: 1"] });
});

test("reports catalog validation and unmanaged path errors", () => {
  expect(
    validateRepositoryCatalog("core-catalog.yaml", { version: 1, components: [] }, []),
  ).toEqual({
    errors: ["FAIL core-catalog.yaml: catalog must define at least one component."],
    lines: [],
  });
  expect(
    validateRepositoryCatalog(
      "core-catalog.yaml",
      { ...catalog, components: [{ ...catalog.components[0], configPaths: ["etc/named.conf"] }] },
      ["etc/kea/kea-dhcp4.conf"],
    ),
  ).toEqual({
    errors: [
      "FAIL core-catalog.yaml: managed path etc/kea/kea-dhcp4.conf is not mapped to a component.",
    ],
    lines: ["PASS service catalog, entries: 1"],
  });
});
