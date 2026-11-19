import { expect, test } from "@jest/globals";
import validateServiceCatalog from "../../src/service-catalog/validate.mjs";

const component = {
  id: "dns",
  name: "DNS",
  configPaths: ["etc/named.conf", "var/named/**"],
  health: { type: "systemd", unit: "named.service" },
  action: { type: "systemd", operation: "reload", unit: "named.service" },
};

test("accepts a valid service catalog", () => {
  expect(validateServiceCatalog({ version: 1, components: [component] })).toEqual([]);
});

test.each([
  [null, "only version and components"],
  [{ version: 2, components: [component] }, "version must be 1"],
  [{ version: 1, components: [] }, "at least one component"],
  [{ version: 1, components: [{ unsupported: true }] }, "unsupported fields"],
  [{ version: 1, components: [{ ...component, id: "Bad" }] }, "id must use"],
  [{ version: 1, components: [component, component] }, "id must be unique"],
  [{ version: 1, components: [{ ...component, name: " " }] }, "name must be"],
  [{ version: 1, components: [{ ...component, configPaths: ["../secret"] }] }, "configPaths"],
  [{ version: 1, components: [{ ...component, configPaths: ["C:\\router"] }] }, "configPaths"],
  [{ version: 1, components: [{ ...component, configPaths: ["etc/*/named"] }] }, "configPaths"],
  [{ version: 1, components: [{ ...component, health: { type: "command" } }] }, "health must"],
  [
    {
      version: 1,
      components: [{ ...component, health: { type: "systemd", unit: "bad unit" } }],
    },
    "health.unit",
  ],
  [{ version: 1, components: [{ ...component, action: { type: "shell" } }] }, "action must"],
  [
    {
      version: 1,
      components: [{ ...component, action: { ...component.action, operation: "stop" } }],
    },
    "operation must",
  ],
  [
    {
      version: 1,
      components: [{ ...component, action: { ...component.action, unit: "bad unit" } }],
    },
    "action.unit",
  ],
])("rejects invalid catalog values %s", (value, message) => {
  expect(validateServiceCatalog(value).join(" ")).toContain(message);
});
