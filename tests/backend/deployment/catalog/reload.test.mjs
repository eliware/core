import { expect, jest, test } from "@jest/globals";
import reloadCatalogConfiguration from "../../../../src/backend/deployment/catalog/reload.mjs";

function setup(stdout = "etc/named.conf\0") {
  return {
    catalog: {
      components: [
        {
          configPaths: ["etc/named.conf"],
          action: { operation: "reload", unit: "named.service" },
        },
      ],
    },
    repositoryPath: "/router",
    previousCommit: "abc",
    run: jest.fn().mockResolvedValue({ stdout }),
    steps: [],
    onStart: jest.fn(),
    onPlan: jest.fn(),
    onReloadStart: jest.fn(),
  };
}

test("plans and runs actions for changed catalog paths", async () => {
  const options = setup();
  await expect(reloadCatalogConfiguration(options)).resolves.toEqual({
    actions: [options.catalog.components[0].action],
    started: true,
  });
  expect(options.onPlan).toHaveBeenCalledWith([options.catalog.components[0].action]);
  expect(options.onReloadStart).toHaveBeenCalledTimes(1);
  expect(options.steps).toEqual([{ name: "reload named.service", status: "passed" }]);
});

test("returns an empty plan without starting a reload", async () => {
  const options = setup("README.md\0");
  await expect(reloadCatalogConfiguration(options)).resolves.toEqual({
    actions: [],
    started: false,
  });
  expect(options.onPlan).toHaveBeenCalledWith([]);
  expect(options.onReloadStart).not.toHaveBeenCalled();
});
