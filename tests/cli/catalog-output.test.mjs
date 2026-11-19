import { expect, test } from "@jest/globals";
import formatCatalogComponent from "../../src/cli/catalog-output.mjs";

test("formats a service catalog component for CLI output", () => {
  expect(
    formatCatalogComponent({
      id: "dns",
      name: "DNS",
      configPaths: ["etc/named.conf", "var/named/**"],
      health: { unit: "named.service" },
      action: { operation: "reload", unit: "named.service" },
    }),
  ).toBe(
    "dns — DNS | paths: etc/named.conf, var/named/** | health: named.service | action: reload named.service",
  );
});
