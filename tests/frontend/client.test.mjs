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
    "[data-metrics-list]",
    "[data-metrics-empty]",
    "[data-metrics-checked-at]",
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
  return {
    elements,
    querySelector: (selector) => elements[selector] ?? null,
    createElement: (tag) => Object.assign(element(), { tag }),
  };
}

async function flushStatusRequest() {
  await Promise.resolve();
  await Promise.resolve();
}

test("fetches dashboard state and schedules refreshes", async () => {
  const document = dashboardDocument();
  const fetcher = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      health: { status: "healthy", units: [] },
      deployment: { status: "idle" },
    }),
  });
  const setIntervalFn = jest.fn(() => "timer");
  expect(renderHome(document, { fetcher, setIntervalFn })).toBe("timer");
  await flushStatusRequest();
  expect(fetcher).toHaveBeenCalledWith("/api/status", { cache: "no-store" });
  expect(setIntervalFn).toHaveBeenCalledWith(expect.any(Function), 30_000);
  expect(document.elements["[data-status]"].textContent).toContain("Updated");
});

test("does not overlap status requests", async () => {
  const document = dashboardDocument();
  const results = [];
  const fetcher = jest.fn(
    () =>
      new Promise((resolve) => {
        results.push(resolve);
      }),
  );
  let poll;
  renderHome(document, { fetcher, setIntervalFn: (callback) => (poll = callback) });
  poll();
  expect(fetcher).toHaveBeenCalledTimes(1);
  results[0]({ ok: true, json: async () => ({}) });
  await flushStatusRequest();
  poll();
  expect(fetcher).toHaveBeenCalledTimes(2);
  results[1]({ ok: true, json: async () => ({}) });
  await flushStatusRequest();
});

test("reports failed requests and tolerates a missing status label", async () => {
  const document = dashboardDocument();
  delete document.elements["[data-status]"];
  renderHome(document, {
    fetcher: async () => ({ ok: false }),
    setIntervalFn: () => undefined,
  });
  await flushStatusRequest();
  renderHome(document, {
    fetcher: async () => ({ ok: true, json: async () => ({}) }),
    setIntervalFn: () => undefined,
    now: () => new Date("invalid"),
  });
  await flushStatusRequest();
});

test("renders a status update when the clock returns no value", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({ ok: true, json: async () => ({}) }),
    setIntervalFn: () => undefined,
    now: () => undefined,
  });
  await flushStatusRequest();
});

test("formats a valid status update time", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({ ok: true, json: async () => ({}) }),
    setIntervalFn: () => undefined,
    now: () => new Date("2026-11-18T12:00:00.000Z"),
  });
  await flushStatusRequest();
  expect(document.elements["[data-status]"].textContent).toContain("Updated");
});

test("formats an invalid status update time safely", async () => {
  const document = dashboardDocument();
  renderHome(document, {
    fetcher: async () => ({ ok: true, json: async () => ({}) }),
    setIntervalFn: () => undefined,
    now: () => new Date("invalid"),
  });
  await flushStatusRequest();
  expect(document.elements["[data-status]"].textContent).toBe("Updated —");
});

test("handles null responses and browser default polling functions", async () => {
  jest.useFakeTimers({ now: new Date("2026-11-18T12:00:00.000Z") });
  const document = dashboardDocument();
  const fetcher = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => null,
  });
  renderHome(document);
  await flushStatusRequest();
  expect(fetcher).toHaveBeenCalledWith("/api/status", { cache: "no-store" });
  jest.clearAllTimers();
  fetcher.mockRestore();
  jest.useRealTimers();
});
