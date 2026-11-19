import { expect, test, jest } from "@jest/globals";
import { resolve } from "node:path";
import runCli from "../src/cli.mjs";

test.each([{ args: [] }, { args: ["--help"] }])("shows usage", async ({ args }) => {
  const write = jest.fn();
  expect(await runCli(args, { version: "9.0.0", write })).toBe(0);
  expect(write).toHaveBeenCalledWith("Usage: core-cli [--help|--version]");
});

test("prints the supplied package version", async () => {
  const write = jest.fn();
  expect(await runCli(["--version"], { version: "9.0.0", write })).toBe(0);
  expect(write).toHaveBeenCalledWith("9.0.0");
});

test("reports an unknown argument and returns the usage error code", async () => {
  const write = jest.fn();
  expect(await runCli(["--unknown"], { version: "9.0.0", write })).toBe(2);
  expect(write).toHaveBeenCalledWith("Unknown argument: --unknown");
});

test("writes an unknown argument through the default output", async () => {
  const write = jest.spyOn(console, "log").mockImplementation(() => {});

  expect(await runCli(["--unknown"], { version: "9.0.0" })).toBe(2);
  expect(write).toHaveBeenCalledWith("Unknown argument: --unknown");

  write.mockRestore();
});

test("rejects extra arguments after a supported option", async () => {
  const write = jest.fn();
  expect(await runCli(["--version", "extra"], { version: "9.0.0", write })).toBe(2);
  expect(write).toHaveBeenCalledWith("Unknown argument: --version");
});

test("runs repository preflight and returns its result", async () => {
  const write = jest.fn();
  const preflightCommand = jest.fn().mockResolvedValue({ ok: true, lines: ["PASS preflight"] });

  expect(await runCli(["preflight"], { version: "1", cwd: "repo", write, preflightCommand })).toBe(
    0,
  );
  expect(preflightCommand).toHaveBeenCalledWith("repo");
  expect(write).toHaveBeenCalledWith("PASS preflight");
});

test("returns a validation error when preflight fails", async () => {
  const preflightCommand = jest.fn().mockResolvedValue({ ok: false, lines: ["FAIL config"] });
  expect(await runCli(["preflight"], { version: "1", write: jest.fn(), preflightCommand })).toBe(1);
});

test("runs pair comparison and reports validation failures", async () => {
  const write = jest.fn();
  const compareCommand = jest.fn().mockResolvedValue({ ok: false, lines: ["FAIL pair"] });

  expect(
    await runCli(["compare", "../core2"], { version: "1", cwd: "repo", write, compareCommand }),
  ).toBe(1);
  expect(compareCommand).toHaveBeenCalledWith("repo", "../core2");
  expect(write).toHaveBeenCalledWith("FAIL pair");
});

test("returns success when pair comparison passes", async () => {
  const compareCommand = jest.fn().mockResolvedValue({ ok: true, lines: ["PASS pair"] });
  expect(
    await runCli(["compare", "../core2"], { version: "1", write: jest.fn(), compareCommand }),
  ).toBe(0);
});

test("lists catalog components", async () => {
  const write = jest.fn();
  const catalogCommand = jest.fn(() => ({
    components: [
      {
        id: "dns",
        name: "DNS",
        configPaths: ["etc/named.conf"],
        health: { unit: "named.service" },
        action: { operation: "reload", unit: "named.service" },
      },
    ],
  }));

  await expect(runCli(["catalog"], { cwd: "router", write, catalogCommand })).resolves.toBe(0);
  expect(catalogCommand).toHaveBeenCalledWith("router");
  expect(write).toHaveBeenCalledWith(
    "dns — DNS | paths: etc/named.conf | health: named.service | action: reload named.service",
  );
});

test("reports an absent catalog", async () => {
  const write = jest.fn();
  await expect(runCli(["catalog"], { write, catalogCommand: () => null })).resolves.toBe(0);
  expect(write).toHaveBeenCalledWith("No service catalog is configured.");
});

test("checks component status in a selected repository", async () => {
  const write = jest.fn();
  const catalogCommand = jest.fn(() => ({ components: [] }));
  const statusCommand = jest
    .fn()
    .mockResolvedValue({ ok: true, lines: ["Healthy: DNS (named.service)"] });
  const systemCommand = jest.fn();
  await expect(
    runCli(["status", "dns", "--repo", "../router"], {
      cwd: "router-root",
      write,
      catalogCommand,
      statusCommand,
      systemCommand,
    }),
  ).resolves.toBe(0);
  expect(catalogCommand).toHaveBeenCalledWith(resolve("router-root", "../router"));
  expect(statusCommand).toHaveBeenCalledWith({
    catalog: { components: [] },
    componentId: "dns",
    run: systemCommand,
  });
  expect(write).toHaveBeenCalledWith("Healthy: DNS (named.service)");
});

test("runs reload against the current repository by default", async () => {
  const reloadCommand = jest
    .fn()
    .mockResolvedValue({ ok: false, lines: ["Failed: reload named.service"] });
  await expect(
    runCli(["reload"], {
      cwd: "router",
      write: jest.fn(),
      catalogCommand: () => ({ components: [] }),
      reloadCommand,
    }),
  ).resolves.toBe(1);
  expect(reloadCommand).toHaveBeenCalledWith({
    catalog: { components: [] },
    componentId: undefined,
    run: expect.any(Function),
  });
});

test("returns the usage code for an unknown component", async () => {
  await expect(
    runCli(["status", "dns"], {
      write: jest.fn(),
      catalogCommand: () => ({ components: [] }),
      statusCommand: jest.fn().mockResolvedValue({
        ok: false,
        usageError: true,
        lines: ["Unknown component: dns"],
      }),
    }),
  ).resolves.toBe(2);
});

test("reports invalid status syntax", async () => {
  const write = jest.fn();
  await expect(runCli(["status", "dns", "dhcp"], { write })).resolves.toBe(2);
  expect(write).toHaveBeenCalledWith("Invalid arguments for status.");
});

test("reports malformed catalogs as operational failures", async () => {
  const write = jest.fn();
  await expect(
    runCli(["reload"], {
      write,
      catalogCommand: () => {
        throw new Error("Invalid core-catalog.yaml");
      },
    }),
  ).resolves.toBe(1);
  expect(write).toHaveBeenCalledWith("Catalog error: Invalid core-catalog.yaml");
});

test("reports a malformed catalog in the catalog command", async () => {
  const write = jest.fn();
  await expect(
    runCli(["catalog"], {
      write,
      catalogCommand: () => {
        throw new Error("Invalid core-catalog.yaml");
      },
    }),
  ).resolves.toBe(1);
  expect(write).toHaveBeenCalledWith("Catalog error: Invalid core-catalog.yaml");
});
