import { expect, test } from "@jest/globals";
import findAffectedComponents from "../../src/service-catalog/affected-components.mjs";

const catalog = {
  components: [
    { configPaths: ["etc/named.conf", "var/named/**"] },
    { configPaths: ["etc/kea/**"] },
  ],
};

test("matches exact files and files below mapped directories", () => {
  expect(findAffectedComponents(catalog, ["etc/named.conf", "var/named/zone"])).toEqual([
    catalog.components[0],
  ]);
  expect(findAffectedComponents(catalog, ["etc/kea/dhcp.conf"])).toEqual([catalog.components[1]]);
});

test("returns no components when there is no catalog or path match", () => {
  expect(findAffectedComponents(null, ["etc/named.conf"])).toEqual([]);
  expect(findAffectedComponents(catalog, ["docs/readme.md", "var/named-backup/zone"])).toEqual([]);
});

test("selects all components when the catalog changes", () => {
  expect(findAffectedComponents(catalog, ["core-catalog.yaml"])).toEqual(catalog.components);
});
