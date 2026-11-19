import { expect, test } from "@jest/globals";
import renderHealth from "../../../src/frontend/render/health.mjs";

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

function dashboard() {
  const elements = Object.fromEntries(
    ["list", "empty", "summary", "dot", "checked"].map((name) => [name, element()]),
  );
  return {
    elements,
    querySelector: (selector) =>
      ({
        "[data-health-list]": elements.list,
        "[data-health-empty]": elements.empty,
        "[data-health-summary]": elements.summary,
        "[data-state-dot]": elements.dot,
        "[data-checked-at]": elements.checked,
      })[selector] ?? null,
    createElement: (tag) => Object.assign(element(), { tag }),
  };
}

test("renders health rows and the aggregate unhealthy state", () => {
  const document = dashboard();
  renderHealth(document, {
    health: {
      status: "healthy",
      checkedAt: "2026-11-18T12:00:00.000Z",
      units: [{ name: "frr.service", status: "healthy", detail: "active", checkedAt: "invalid" }],
    },
    metrics: { components: [{ status: "unhealthy" }] },
  });
  expect(document.elements.summary.textContent).toBe("One or more router checks need attention");
  expect(document.elements.dot.dataset.state).toBe("unhealthy");
  expect(document.elements.empty.hidden).toBe(true);
  expect(document.elements.list.children[0].children.map(({ textContent }) => textContent)).toEqual(
    ["", "frr.service", "active", "—"],
  );
});

test.each([
  [{ status: "unavailable" }, "Some router data is unavailable"],
  [{ status: "unknown" }, "Router checks are pending"],
  [{ status: "healthy" }, "All available router checks are healthy"],
  [
    { status: "unconfigured", metrics: [{ status: "healthy" }] },
    "All available router checks are healthy",
  ],
  [{ status: "degraded" }, "Router checks are pending"],
])("renders aggregate status %s", ({ status, metrics }, summary) => {
  const document = dashboard();
  renderHealth(document, { health: { status, units: [] }, metrics: { components: metrics } });
  expect(document.elements.summary.textContent).toBe(summary);
  expect(document.elements.checked.textContent).toBe("Waiting for first check");
  expect(document.elements.empty.hidden).toBe(false);
});

test("uses metric status when system health is unconfigured or incomplete", () => {
  const document = dashboard();
  renderHealth(document, {
    health: { status: "healthy" },
    metrics: { components: [{ status: "unknown" }] },
  });
  expect(document.elements.dot.dataset.state).toBe("unknown");
  expect(document.elements.summary.textContent).toBe("Router checks are pending");
});

test("uses unavailable metric status for a healthy system", () => {
  const document = dashboard();
  renderHealth(document, {
    health: { status: "healthy", units: [] },
    metrics: { components: [{ status: "unavailable" }] },
  });
  expect(document.elements.dot.dataset.state).toBe("unavailable");
});

test("uses defaults for missing unit fields and optional dashboard fields", () => {
  const list = element();
  renderHealth(
    {
      querySelector: (selector) => (selector === "[data-health-list]" ? list : null),
      createElement: (tag) => Object.assign(element(), { tag }),
    },
    { health: { units: [{}] } },
  );
  expect(list.children[0].children.map(({ textContent }) => textContent)).toEqual([
    "",
    "Unknown application",
    "unknown",
    "—",
  ]);
});

test("uses the unknown status when the health result has no state", () => {
  const document = dashboard();
  renderHealth(document, { health: { units: [] } });
  expect(document.elements.dot.dataset.state).toBe("unknown");
});

test("tolerates missing dashboard elements and health data", () => {
  renderHealth({ querySelector: () => null }, {});
  const list = element();
  renderHealth(
    {
      querySelector: (selector) => (selector === "[data-health-list]" ? list : null),
      createElement: (tag) => Object.assign(element(), { tag }),
    },
    {},
  );
  expect(list.children).toEqual([]);
});
