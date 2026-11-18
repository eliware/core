import { expect, jest, test } from "@jest/globals";
const defaultRun = jest.fn().mockReturnValue({ status: 0, stdout: "README.md\0" });
jest.unstable_mockModule("node:child_process", () => ({ spawnSync: defaultRun }));
const { default: listRepositoryFiles } = await import("../src/repo-files.mjs");

test("lists tracked and untracked repository files", () => {
  const run = jest.fn().mockReturnValue({ status: 0, stdout: "etc\\core.conf\0README.md\0" });

  expect(listRepositoryFiles("C:/repo", { run })).toEqual({
    files: ["README.md", "etc/core.conf"],
  });
  expect(run).toHaveBeenCalledWith(
    "git",
    ["-C", "C:/repo", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    expect.objectContaining({ encoding: "utf8" }),
  );
});

test("reports a Git launch failure", () => {
  const run = jest.fn().mockReturnValue({ error: new Error("missing git") });

  expect(listRepositoryFiles("repo", { run })).toEqual({
    error: "Could not list repository files: missing git",
  });
});

test("reports a failed Git inventory", () => {
  const run = jest.fn().mockReturnValue({ status: 128, stdout: "" });

  expect(listRepositoryFiles("repo", { run })).toEqual({
    error: "Could not list repository files with Git.",
  });
});

test("uses the default Git runner when no options are provided", () => {
  expect(listRepositoryFiles("repo")).toEqual({ files: ["README.md"] });
  expect(defaultRun).toHaveBeenCalledWith(
    "git",
    expect.arrayContaining(["ls-files", "--cached", "--others"]),
    expect.any(Object),
  );
});
