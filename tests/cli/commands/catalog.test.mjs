import { expect, test } from "@jest/globals";
import runCatalogCommand from "../../../src/cli/commands/catalog.mjs";

test("formats configured catalog components", () => {
  expect(
    runCatalogCommand("/router", () => ({
      components: [
        {
          id: "dns",
          name: "DNS",
          configPaths: ["etc/named.conf"],
          health: { unit: "named.service" },
          action: { operation: "reload", unit: "named.service" },
        },
      ],
    })),
  ).toEqual({
    ok: true,
    lines: [
      "dns — DNS | paths: etc/named.conf | health: named.service | action: reload named.service",
    ],
  });
});

test("reports missing and invalid catalogs", () => {
  expect(runCatalogCommand("/router", () => null)).toEqual({
    ok: true,
    lines: ["No service catalog is configured."],
  });
  expect(
    runCatalogCommand("/router", () => {
      throw new Error("invalid YAML");
    }),
  ).toEqual({
    ok: false,
    lines: ["Catalog error: invalid YAML"],
  });
});
