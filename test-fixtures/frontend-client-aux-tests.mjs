import { expect, test } from "@jest/globals";
import renderHome from "../src/frontend/client.mjs";

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

test("supports documents without the dashboard or status label", () => {
  const status = {};
  renderHome({ querySelector: (selector) => (selector === "[data-status]" ? status : null) });
  expect(status.textContent).toBe("Core dashboard assets loaded.");
  expect(renderHome({ querySelector: () => null })).toBeUndefined();
});
