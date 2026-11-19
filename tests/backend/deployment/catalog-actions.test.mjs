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

test("records selected action results and stops at the first failure", async () => {
  const run = jest
    .fn()
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error("systemd failed"));
  const steps = [];
  await expect(
    runCatalogActions({
      actions: [
        catalog.components[0].action,
        { operation: "restart", unit: "frr.service" },
        { operation: "reload", unit: "haproxy.service" },
      ],
      repositoryPath: "/router",
      run,
      steps,
      onStart: jest.fn(),
    }),
  ).rejects.toMatchObject({ stepName: "restart frr.service" });
  expect(steps.map(({ name, status }) => ({ name, status }))).toEqual([
    { name: "reload named.service", status: "passed" },
    { name: "restart frr.service", status: "failed" },
  ]);
  expect(run).toHaveBeenCalledTimes(2);
});

test("accepts an empty action list", async () => {
  await expect(
    runCatalogActions({ actions: [], repositoryPath: "/router", run: jest.fn(), steps: [] }),
  ).resolves.toBeUndefined();
});
