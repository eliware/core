import { expect, jest, test } from "@jest/globals";
import runStatusCommand from "../../../src/cli/commands/status.mjs";

test("loads a selected repository and runs the status command", async () => {
  const parsed = { repositoryPath: "../router", componentId: "dns" };
  const catalog = { components: [] };
  const catalogCommand = jest.fn(() => catalog);
  const statusCommand = jest.fn().mockResolvedValue({ ok: true, lines: ["Healthy"] });
  const systemCommand = jest.fn();
  await expect(
    runStatusCommand(parsed, { cwd: "/root", catalogCommand, statusCommand, systemCommand }),
  ).resolves.toEqual({ ok: true, lines: ["Healthy"] });
  expect(catalogCommand).toHaveBeenCalledWith(expect.stringContaining("router"));
  expect(statusCommand).toHaveBeenCalledWith({ catalog, componentId: "dns", run: systemCommand });
});

test("reports catalog errors for the current repository", async () => {
  const statusCommand = jest.fn();
  await expect(
    runStatusCommand(
      { componentId: undefined },
      {
        cwd: "/router",
        catalogCommand: () => {
          throw new Error("invalid catalog");
        },
        statusCommand,
        systemCommand: jest.fn(),
      },
    ),
  ).resolves.toEqual({ ok: false, lines: ["Catalog error: invalid catalog"] });
  expect(statusCommand).not.toHaveBeenCalled();
});
