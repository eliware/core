import { expect, jest, test } from "@jest/globals";
import reloadConfiguration from "../../../src/backend/deployment/reload-configuration.mjs";

const catalog = {
  components: [
    {
      configPaths: ["etc/named.conf"],
      action: { operation: "reload", unit: "named.service" },
    },
  ],
};

function setup(overrides = {}) {
  return {
    loadCatalog: () => catalog,
    previousCommit: "abc",
    repositoryPath: "/router",
    run: jest.fn().mockResolvedValue({ stdout: "etc/named.conf\n" }),
    runStep: jest.fn(),
    steps: [],
    onStart: jest.fn(),
    onPlan: jest.fn(),
    onReloadStart: jest.fn(),
    ...overrides,
  };
}

test("uses npm reload when the repository has no catalog", async () => {
  const state = setup({ loadCatalog: undefined });

  await expect(reloadConfiguration(state)).resolves.toEqual({ actions: undefined, started: true });
  expect(state.runStep).toHaveBeenCalledWith("npm run reload", "npm", ["run", "reload"]);
  expect(state.onReloadStart).toHaveBeenCalledTimes(1);
});

test("runs targeted actions from the catalog", async () => {
  const state = setup();

  await expect(reloadConfiguration(state)).resolves.toEqual({
    actions: [catalog.components[0].action],
    started: true,
  });
  expect(state.run).toHaveBeenCalledWith(
    "systemctl",
    ["reload", "named.service"],
    expect.objectContaining({ cwd: "/router" }),
  );
  expect(state.onPlan).toHaveBeenCalledWith([catalog.components[0].action]);
  expect(state.onReloadStart).toHaveBeenCalledTimes(1);
});

test("captures planned actions before attempting a reload", async () => {
  const run = jest.fn(async (command, args) => {
    if (command === "git" && args[0] === "diff") return { stdout: "etc/named.conf\n" };
    if (command === "systemctl") throw new Error("systemctl failed");
    return {};
  });
  const state = setup({ run });

  await expect(reloadConfiguration(state)).rejects.toMatchObject({
    stepName: "reload named.service",
  });
  expect(state.onPlan).toHaveBeenCalledWith([catalog.components[0].action]);
  expect(state.onReloadStart).toHaveBeenCalledTimes(1);
});

test("records when no catalog component changed", async () => {
  const state = setup({ run: jest.fn().mockResolvedValue({ stdout: "README.md\n" }) });

  await expect(reloadConfiguration(state)).resolves.toEqual({ actions: [], started: false });
  expect(state.steps).toEqual([{ name: "No catalog components changed", status: "passed" }]);
  expect(state.onPlan).toHaveBeenCalledWith([]);
  expect(state.onReloadStart).not.toHaveBeenCalled();
  expect(state.onStart).toHaveBeenCalledWith("No catalog components changed", state.steps);
});
