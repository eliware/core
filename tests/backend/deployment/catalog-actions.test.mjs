import { expect, jest, test } from "@jest/globals";
import runCatalogActions from "../../../src/backend/deployment/catalog-actions.mjs";

const catalog = {
  version: 1,
  components: [
    {
      id: "dns",
      name: "DNS",
      configPaths: ["etc/named.conf", "var/named/**"],
      health: { type: "systemd", unit: "named.service" },
      action: { type: "systemd", operation: "reload", unit: "named.service" },
    },
  ],
};

test("runs each action and records deployment steps", async () => {
  const run = jest.fn().mockResolvedValue({});
  const steps = [];
  const onStart = jest.fn();

  await runCatalogActions({
    actions: [catalog.components[0].action],
    repositoryPath: "/router",
    run,
    steps,
    onStart,
  });

  expect(run).toHaveBeenCalledWith(
    "systemctl",
    ["reload", "named.service"],
    expect.objectContaining({ cwd: "/router" }),
  );
  expect(steps).toEqual([{ name: "reload named.service", status: "passed" }]);
  expect(onStart).toHaveBeenCalledWith("reload named.service", steps);
});

test("stops at the first failed catalog action", async () => {
  const run = jest.fn().mockRejectedValue(new Error("systemd failed"));
  const steps = [];

  await expect(
    runCatalogActions({
      actions: [catalog.components[0].action],
      repositoryPath: "/router",
      run,
      steps,
      onStart: jest.fn(),
    }),
  ).rejects.toMatchObject({ stepName: "reload named.service" });
  expect(steps).toEqual([
    { name: "reload named.service", status: "failed", detail: "systemd failed" },
  ]);
});

test("accepts an empty action list", async () => {
  await expect(
    runCatalogActions({ actions: [], repositoryPath: "/router", run: jest.fn(), steps: [] }),
  ).resolves.toBeUndefined();
});
