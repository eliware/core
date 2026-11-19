import { expect, test } from "@jest/globals";
import selectComponents from "../../src/cli/component-selection.mjs";

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
