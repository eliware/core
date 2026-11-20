import { expect, test } from "@jest/globals";
import createMetricsConfiguration from "../../../src/backend/metrics/configuration.mjs";

test("creates unknown status entries for built-in metric sources", () => {
  const { configured, initialStatus } = createMetricsConfiguration(undefined);
  expect(configured.map(({ metric }) => metric.type)).toEqual([
    "interfaces",
    "routes",
    "arp",
    "frr",
    "vrrp",
  ]);
  expect(initialStatus.checkedAt).toBeNull();
  expect(initialStatus.components[0]).toMatchObject({
    id: "interfaces",
    status: "unknown",
    detail: "Waiting for first check",
  });
});

test("overrides built-ins and adds catalog metrics without empty components", () => {
  const catalog = {
    components: [
      { id: "wan", name: "WAN", metrics: [{ type: "interfaces" }] },
      { id: "dns", name: "DNS", metrics: [{ type: "dns-cache" }] },
      { id: "empty", name: "Empty" },
    ],
  };
  const { configured, initialStatus } = createMetricsConfiguration(catalog);
  expect(configured.map(({ component }) => component.id)).toEqual([
    "wan",
    "routes",
    "arp",
    "frr",
    "vrrp",
    "dns",
  ]);
  expect(initialStatus.components.map(({ type }) => type)).toContain("dns-cache");
});

test("configures every catalog metric that shares a built-in type", () => {
  const catalog = {
    components: [
      { id: "wan", name: "WAN", metrics: [{ type: "interfaces" }, { type: "interfaces" }] },
    ],
  };
  const { configured } = createMetricsConfiguration(catalog);
  expect(configured.filter(({ metric }) => metric.type === "interfaces")).toEqual([
    { component: catalog.components[0], metric: catalog.components[0].metrics[0] },
    { component: catalog.components[0], metric: catalog.components[0].metrics[1] },
  ]);
});
