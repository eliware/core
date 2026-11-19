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
  const run = jest.fn().mockResolvedValue({ stdout: "etc/named.conf\nREADME.md\n" });

  await expect(
    planCatalogActions({ catalog, repositoryPath: "/router", previousCommit: "abc", run }),
  ).resolves.toEqual([catalog.components[0].action]);
  expect(run).toHaveBeenCalledWith("git", ["diff", "--name-only", "abc", "HEAD", "--"], {
    cwd: "/router",
    encoding: "utf8",
  });
});

test("returns no action when changed paths do not match", async () => {
  const run = jest.fn().mockResolvedValue({});
  await expect(
    planCatalogActions({ catalog, repositoryPath: "/router", previousCommit: "abc", run }),
  ).resolves.toEqual([]);
});
