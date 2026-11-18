import { expect, test, jest } from "@jest/globals";
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
