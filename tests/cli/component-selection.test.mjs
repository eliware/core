import { expect, test } from "@jest/globals";
import selectComponents from "../../src/cli/component-selection.mjs";
import checkCatalogStatus from "../../src/cli/status.mjs";
import reloadCatalogComponents from "../../src/cli/reload.mjs";

const components = [
  { id: "dns", name: "DNS" },
  { id: "frr", name: "FRR" },
];

test("reports a missing catalog", () => {
  expect(selectComponents(undefined)).toEqual({ error: "No service catalog is configured." });
});

test("selects every catalog component when no ID is given", () => {
  expect(selectComponents({ components })).toEqual({ components });
});

test("selects a matching catalog component", () => {
  expect(selectComponents({ components }, "frr")).toEqual({ components: [components[1]] });
});

test.each([
  [{ components }, "missing"],
  [{ components: [] }, undefined],
])("reports an unknown selection", (catalog, componentId) => {
  expect(selectComponents(catalog, componentId)).toEqual({
    error: `Unknown component: ${componentId}`,
    usageError: true,
  });
});

test("status and reload operations return shared selection errors", async () => {
  const args = { catalog: null, run: () => Promise.resolve() };
  await expect(checkCatalogStatus(args)).resolves.toMatchObject({
    ok: false,
    lines: ["No service catalog is configured."],
  });
  await expect(reloadCatalogComponents(args)).resolves.toMatchObject({
    ok: false,
    lines: ["No service catalog is configured."],
  });
  await expect(
    checkCatalogStatus({ ...args, catalog: { components }, componentId: "missing" }),
  ).resolves.toMatchObject({ usageError: true, lines: ["Unknown component: missing"] });
  await expect(
    reloadCatalogComponents({ ...args, catalog: { components }, componentId: "missing" }),
  ).resolves.toMatchObject({ usageError: true, lines: ["Unknown component: missing"] });
});
