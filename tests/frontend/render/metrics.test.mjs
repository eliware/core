import { expect, test } from "@jest/globals";
import renderMetrics from "../../../src/frontend/render/metrics.mjs";

function element() {
  return {
    dataset: {},
    children: [],
    append(child) {
      this.children.push(child);
    },
    replaceChildren() {
      this.children = [];
    },
  };
}

function documentFixture() {
  const elements = { list: element(), empty: element(), checked: element() };
  return {
    elements,
    querySelector(selector) {
      return (
        {
          "[data-metrics-list]": elements.list,
          "[data-metrics-empty]": elements.empty,
          "[data-metrics-checked-at]": elements.checked,
        }[selector] ?? null
      );
    },
    createElement: (tag) => Object.assign(element(), { tag }),
  };
}

test("renders metric totals, detail rows, timestamps, and unavailable states", () => {
  const document = documentFixture();
  renderMetrics(document, {
    checkedAt: "2026-11-19T12:00:00.000Z",
    components: [
      {
        name: "WAN",
        type: "interfaces",
        status: "healthy",
        checkedAt: "2026-11-19T12:00:00.000Z",
        values: {
          totals: { interfaces: 1, up: 1, rxBytes: 100 },
          interfaces: [{ name: "eth0", state: "up" }],
        },
      },
      {
        name: "DNS",
        type: "dns-cache",
        status: "unavailable",
        checkedAt: "2026-11-19T12:00:00.000Z",
        detail: "statistics file missing",
        values: null,
      },
    ],
  });
  expect(document.elements.list.children).toHaveLength(2);
  expect(document.elements.list.children[0].children[0].dataset.state).toBe("healthy");
  expect(
    document.elements.list.children[0].children[1].children.map(({ textContent }) => textContent),
  ).toContain("interfaces: 1 · up: 1 · rxBytes: 100");
  expect(document.elements.list.children[1].children[1].children[1].textContent).toBe(
    "statistics file missing",
  );
  expect(document.elements.empty.hidden).toBe(true);
  expect(document.elements.checked.textContent).toContain("Updated");
});

test("shows no configured sources and tolerates a missing metric list", () => {
  const document = documentFixture();
  renderMetrics(document, { components: [] });
  expect(document.elements.empty.hidden).toBe(false);
  renderMetrics({ querySelector: () => null }, {});
});

test("shows unknown sources and skips absent optional dashboard fields", () => {
  const list = element();
  const document = {
    querySelector: (selector) => (selector === "[data-metrics-list]" ? list : null),
    createElement: (tag) => Object.assign(element(), { tag }),
  };
  renderMetrics(document, {
    components: [
      {
        checkedAt: "invalid",
        values: {
          totals: { count: null, enabled: false, nested: {} },
          interfaces: [{ name: "eth0", extra: {}, absent: null }],
        },
      },
      { values: { totals: { count: 1 } } },
      {
        values: {
          count: 2,
          backends: [{ name: "api", state: "UP", addresses: ["10.0.0.1/24", "10.0.0.2/24"] }],
        },
      },
      {
        values: {
          totals: {},
          peers: [],
          routes: Array.from({ length: 101 }, (_value, index) => ({ prefix: `route-${index}` })),
        },
      },
    ],
  });
  expect(list.children).toHaveLength(4);
  expect(list.children[0].children[0].dataset.state).toBe("unknown");
  expect(list.children[0].children[1].children.map(({ textContent }) => textContent)).toContain(
    "count: — · enabled: false",
  );
  expect(list.children[1].children[1].children[2].textContent).toBe("—");
  expect(list.children[2].children[1].children.at(-1).children[1].children[0].textContent).toBe(
    "name: api · state: UP · addresses: 10.0.0.1/24, 10.0.0.2/24",
  );
  expect(list.children[3].children[1].children.at(-1).children[1].children.at(-1).textContent).toBe(
    "Showing 100 of 101 entries",
  );
});
