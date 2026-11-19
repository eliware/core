import { expect, jest, test } from "@jest/globals";
import checkShellSyntax from "../../src/preflight/shell-syntax.mjs";

test("checks shell files and counts successful Bash syntax checks", () => {
  const run = jest.fn().mockReturnValue({ status: 0 });
  const readFile = jest.fn().mockReturnValue("#!/usr/bin/env bash\ntrue\n");
  expect(checkShellSyntax("C:/repo", ["scripts/check.sh", "README.md"], { run, readFile })).toEqual(
    { count: 1, errors: [] },
  );
  expect(readFile).toHaveBeenCalledWith("C:\\repo\\scripts\\check.sh", "utf8");
  expect(run).toHaveBeenCalledWith("bash", ["-n"], {
    cwd: "C:/repo",
    encoding: "utf8",
    input: "#!/usr/bin/env bash\ntrue\n",
  });
});

test("reports Bash command errors and nonzero syntax checks", () => {
  const run = jest
    .fn()
    .mockReturnValueOnce({ error: new Error("Bash is missing") })
    .mockReturnValueOnce({ status: 1 });
  expect(checkShellSyntax(".", ["one.sh", "two.sh"], { run, readFile: () => "broken" })).toEqual({
    count: 0,
    errors: ["FAIL Bash syntax: one.sh.", "FAIL Bash syntax: two.sh."],
  });
});

test("reports shell files that cannot be read", () => {
  const run = jest.fn();
  expect(
    checkShellSyntax(".", ["missing.sh"], {
      run,
      readFile: () => {
        throw new Error("denied");
      },
    }),
  ).toEqual({ count: 0, errors: ["FAIL Bash syntax: missing.sh."] });
  expect(run).not.toHaveBeenCalled();
});

test("uses the default file and Bash command adapters", () => {
  expect(checkShellSyntax(process.cwd(), ["test-fixtures/valid-shell-syntax.sh"]).errors).toEqual(
    [],
  );
});
