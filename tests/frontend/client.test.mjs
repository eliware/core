import { expect, jest, test } from "@jest/globals";
import renderHome from "../../src/frontend/client.mjs";

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

function dashboardDocument() {
  const selectors = [
    "[data-status]",
    "[data-health-list]",
    "[data-health-empty]",
    "[data-health-summary]",
    "[data-state-dot]",
    "[data-checked-at]",
    "[data-deployment-state]",
    "[data-deployment-start]",
    "[data-deployment-step]",
    "[data-deployment-result]",
    "[data-step-list]",
  ];
  const elements = Object.fromEntries(selectors.map((selector) => [selector, element()]));
  elements["[data-health-empty]"].hidden = true;
  return {
    elements,
    querySelector: (selector) => elements[selector] ?? null,
    createElement: (tag) => Object.assign(element(), { tag }),
  };
}

test("renders the status dashboard and polls its read-only endpoint", async () => {
  const document = dashboardDocument();
  let poll;
  const setIntervalFn = jest.fn((callback) => {
    poll = callback;
    return "timer";
  });
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      health: {
        status: "unhealthy",
        checkedAt: "2026-11-18T12:00:00.000Z",
        units: [
          {
            name: "frr.service",
            status: "unhealthy",
            detail: "Unit is not active",
            checkedAt: "2026-11-18T12:00:00.000Z",
          },
          { name: "sshd.service", status: "healthy", checkedAt: "invalid" },
        ],
      },
      deployment: {
        status: "failed",
        startedAt: "2026-11-18T11:00:00.000Z",
        failedStep: "npm test",
        error: "Tests failed.",
        steps: [{ name: "npm test", status: "failed", detail: "Tests failed." }],
      },
    }),
  });
  expect(
    renderHome(document, {
      fetcher,
      setIntervalFn,
      now: () => new Date("2026-11-18T12:00:00.000Z"),
    }),
  ).toBe("timer");
  await Promise.resolve();
  await Promise.resolve();
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 30_000);
  expect(fetcher).toHaveBeenCalledWith("/api/status", { cache: "no-store" });
  expect(document.elements["[data-health-summary]"].textContent).toContain("attention");
  expect(document.elements["[data-health-empty]"].hidden).toBe(true);
  expect(document.elements["[data-health-list]"].children).toHaveLength(2);
  expect(document.elements["[data-health-list]"].children[0].children[1].textContent).toBe(
    "frr.service",
  );
  expect(document.elements["[data-deployment-state]"].textContent).toBe("failed");
  expect(document.elements["[data-deployment-step]"].textContent).toBe("npm test");
  expect(document.elements["[data-step-list]"].children).toHaveLength(1);
  await poll();
});

test("shows empty health configuration and generic deployment state", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({
      ok: true,
      json: async () => ({ health: { status: "unconfigured", units: [] }, deployment: {} }),
    }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.elements["[data-health-empty]"].hidden).toBe(false);
  expect(document.elements["[data-deployment-state]"].textContent).toBe("unknown");
  expect(document.elements["[data-deployment-result]"].textContent).toBe("unknown");
});

test("shows retry text when the status endpoint fails", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({ ok: false }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.elements["[data-status]"].textContent).toContain("unavailable");
});

test("supports a non-dashboard document with or without a status label", () => {
  const status = {};
  renderHome({ querySelector: (selector) => (selector === "[data-status]" ? status : null) });
  expect(status.textContent).toBe("Core dashboard assets loaded.");
  expect(renderHome({ querySelector: () => null })).toBeUndefined();
});

test("renders partial health and deployment data without optional page elements", async () => {
  const healthList = element();
  const document = {
    querySelector: (selector) => (selector === "[data-health-list]" ? healthList : null),
    createElement: (tag) => Object.assign(element(), { tag }),
  };
  renderHome(document, {
    fetcher: async () => ({
      ok: true,
      json: async () => ({
        health: { status: "degraded", units: [{}] },
        deployment: { status: "failed", recovery: "Previous commit restored.", steps: [{}] },
      }),
    }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(healthList.children).toHaveLength(1);
  expect(healthList.children[0].children.map((child) => child.textContent)).toEqual([
    "",
    "Unknown application",
    "unknown",
    "—",
  ]);
});

test("skips health rendering when the list is absent during refresh", async () => {
  const list = element();
  let count = 0;
  const document = {
    querySelector: (selector) => (selector === "[data-health-list]" && ++count === 1 ? list : null),
    createElement: (tag) => Object.assign(element(), { tag }),
  };
  renderHome(document, {
    fetcher: async () => ({ ok: true, json: async () => ({ health: {}, deployment: null }) }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
});

test("renders missing deployment step fields with safe defaults", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({
      ok: true,
      json: async () => ({ health: { units: [] }, deployment: { steps: [{}] } }),
    }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
  const [step] = document.elements["[data-step-list]"].children;
  expect(step.children.map((child) => child.textContent)).toEqual(["Unknown step", "unknown"]);
  expect(step.dataset.state).toBe("unknown");
});

test("skips rendering when a status payload is null", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({ ok: true, json: async () => null }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.elements["[data-status]"].textContent).toContain("Updated");
});

test("handles health payloads without a unit list", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({ ok: true, json: async () => ({ health: {} }) }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(document.elements["[data-health-empty]"].hidden).toBe(false);
});

test("uses browser defaults for polling and time and handles a missing footer label", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const document = dashboardDocument();
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ deployment: { status: "idle", steps: [] } }),
  });
  renderHome(document);
  await Promise.resolve();
  await Promise.resolve();
  expect(fetcher).toHaveBeenCalledWith("/api/status", { cache: "no-store" });
  expect(document.elements["[data-health-summary]"].textContent).toBe("Health checks are pending");
  expect(document.elements["[data-state-dot]"].dataset.state).toBe("unknown");
  expect(document.elements["[data-health-empty]"].hidden).toBe(false);
  expect(document.elements["[data-deployment-result]"].textContent).toBe("No deployment recorded.");

  const noFooter = dashboardDocument();
  delete noFooter.elements["[data-status]"];
  fetcher.mockRejectedValueOnce(new Error("Offline"));
  renderHome(noFooter, {
    fetcher,
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await Promise.resolve();
  await Promise.resolve();
  jest.clearAllTimers();
  fetcher.mockRestore();
  jest.useRealTimers();
});
