import { expect, jest, test } from "@jest/globals";

const documentMock = {};
const serviceWorkerMock = { register: jest.fn().mockResolvedValue(undefined) };
const renderHome = jest.fn();
globalThis.document = documentMock;
globalThis.navigator = { serviceWorker: serviceWorkerMock };
jest.unstable_mockModule("../../../src/frontend/client.mjs", () => ({ default: renderHome }));
await import("../../../src/frontend/client/entry.mjs");
delete globalThis.document;
delete globalThis.navigator;

test("passes the page document to the browser client", () => {
  expect(renderHome).toHaveBeenCalledWith(documentMock);
});

test("registers the app service worker", () => {
  expect(serviceWorkerMock.register).toHaveBeenCalledWith("/service-worker.js");
});

test("handles rejected and unavailable service worker registration", async () => {
  jest.resetModules();
  const register = jest.fn().mockRejectedValue(new Error("registration denied"));
  globalThis.document = documentMock;
  globalThis.navigator = { serviceWorker: { register } };
  await import("../../../src/frontend/client/entry.mjs");
  await Promise.resolve();
  expect(register).toHaveBeenCalledWith("/service-worker.js");

  jest.resetModules();
  globalThis.navigator = {};
  await import("../../../src/frontend/client/entry.mjs");
  expect(renderHome).toHaveBeenLastCalledWith(documentMock);
  delete globalThis.document;
  delete globalThis.navigator;
});
