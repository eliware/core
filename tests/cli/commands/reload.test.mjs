import { expect, jest, test } from "@jest/globals";
import runReloadCommand from "../../../src/cli/commands/reload.mjs";

test("loads a selected repository and runs the reload command", async () => {
  const catalog = { components: [] };
  const catalogCommand = jest.fn(() => catalog);
  const reloadCommand = jest.fn().mockResolvedValue({ ok: true, lines: ["Reloaded"] });
  const systemCommand = jest.fn();
  await expect(
    runReloadCommand(
      { repositoryPath: "router", componentId: "dns" },
      { cwd: "/root", catalogCommand, reloadCommand, systemCommand },
    ),
  ).resolves.toEqual({ ok: true, lines: ["Reloaded"] });
  expect(reloadCommand).toHaveBeenCalledWith({ catalog, componentId: "dns", run: systemCommand });
});

test("reports catalog errors and skips reload execution", async () => {
  const reloadCommand = jest.fn();
  await expect(
    runReloadCommand(
      {},
      {
        cwd: "/router",
        catalogCommand: () => {
          throw new Error("invalid catalog");
        },
        reloadCommand,
        systemCommand: jest.fn(),
      },
    ),
  ).resolves.toEqual({ ok: false, lines: ["Catalog error: invalid catalog"] });
  expect(reloadCommand).not.toHaveBeenCalled();
});
