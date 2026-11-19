import { expect, test } from "@jest/globals";
import listCatalogActions from "../../src/service-catalog/actions.mjs";

const first = { action: { operation: "reload", unit: "named.service" } };
const second = { action: { operation: "restart", unit: "kea.service" } };

test("deduplicates shared reload actions", () => {
  expect(listCatalogActions([first, first])).toEqual([first.action]);
  expect(listCatalogActions([first, second])).toEqual([first.action, second.action]);
  expect(listCatalogActions([])).toEqual([]);
});
