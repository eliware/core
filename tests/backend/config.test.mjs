import { expect, jest, test } from "@jest/globals";

const loadApplicationEnvironment = jest.fn();
const loadApplicationSettings = jest.fn();
jest.unstable_mockModule("../../src/backend/config/environment.mjs", () => ({
  default: loadApplicationEnvironment,
}));
jest.unstable_mockModule("../../src/backend/config/application.mjs", () => ({
  default: loadApplicationSettings,
}));
const { default: loadApplicationConfig } = await import("../../src/backend/config.mjs");

test("coordinates environment mapping and settings validation", () => {
  const environment = { PORT: "8080" };
  const values = { port: "8080" };
  const settings = { tcpEndpoint: 8080 };
  loadApplicationEnvironment.mockReturnValue(values);
  loadApplicationSettings.mockReturnValue(settings);

  expect(loadApplicationConfig({ environment })).toBe(settings);
  expect(loadApplicationEnvironment).toHaveBeenCalledWith(environment);
  expect(loadApplicationSettings).toHaveBeenCalledWith(values);
  loadApplicationEnvironment.mockReset();
  loadApplicationSettings.mockReset();
});
