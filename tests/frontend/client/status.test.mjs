import { expect, test } from "@jest/globals";
import renderHome from "../../../src/frontend/client.mjs";
import createClientStatus from "../../../src/frontend/client/status.mjs";

test("shows retry text when the status endpoint fails", async () => {
  const status = {};
  const healthList = { replaceChildren() {} };
  const document = {
    querySelector: (selector) =>
      ({ "[data-status]": status, "[data-health-list]": healthList })[selector] ?? null,
  };
  renderHome(document, {
    fetcher: async () => ({ ok: false }),
    setIntervalFn: () => undefined,
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(status.textContent).toContain("unavailable");
});

test("reports when documents do not have the dashboard", () => {
  const status = {};
  const document = { querySelector: (selector) => (selector === "[data-status]" ? status : null) };
  expect(renderHome(document)).toBeUndefined();
  expect(status.textContent).toBe("Core dashboard assets loaded.");
  expect(renderHome({ querySelector: () => null })).toBeUndefined();
  expect(createClientStatus({ querySelector: () => null }, null).canRender).toBe(false);
});

test("reports retry messages only when a status element exists", () => {
  const status = {};
  const clientStatus = createClientStatus({ querySelector: () => ({}) }, status);
  expect(clientStatus.canRender).toBe(true);
  clientStatus.showUnavailable();
  expect(status.textContent).toBe("Status is unavailable. Retrying shortly.");
  expect(createClientStatus({ querySelector: () => ({}) }, null).showUnavailable()).toBeUndefined();
});
