import { expect, jest, test } from "@jest/globals";
import planCatalogActions from "../../../src/backend/deployment/plan-catalog-actions.mjs";

const catalog = {
  components: [
    {
      configPaths: ["etc/named.conf", "var/named/**"],
      action: { operation: "reload", unit: "named.service" },
    },
  ],
};

test("plans actions for changed catalog paths", async () => {
  const run = jest.fn().mockResolvedValue({ stdout: "etc/named.conf\0README.md\0" });

  await expect(
    planCatalogActions({ catalog, repositoryPath: "/router", previousCommit: "abc", run }),
  ).resolves.toEqual([catalog.components[0].action]);
  expect(run).toHaveBeenCalledWith(
    "git",
    ["diff", "--no-renames", "--name-only", "-z", "abc", "HEAD", "--"],
    {
      cwd: "/router",
      encoding: "utf8",
    },
  );
});

test("selects both owners when a committed file moves between component paths", async () => {
  const movedCatalog = {
    components: [
      { configPaths: ["etc/named.conf"], action: { operation: "reload", unit: "named.service" } },
      {
        configPaths: ["etc/dns/named.conf"],
        action: { operation: "restart", unit: "unbound.service" },
      },
    ],
  };
  const run = jest.fn().mockResolvedValue({ stdout: "etc/named.conf\0etc/dns/named.conf\0" });
  await expect(
    planCatalogActions({
      catalog: movedCatalog,
      repositoryPath: "/router",
      previousCommit: "abc",
      run,
    }),
  ).resolves.toEqual(movedCatalog.components.map(({ action }) => action));
});

test("returns no action when changed paths do not match", async () => {
  const run = jest.fn().mockResolvedValue({});
  await expect(
    planCatalogActions({ catalog, repositoryPath: "/router", previousCommit: "abc", run }),
  ).resolves.toEqual([]);
});
