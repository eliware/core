import { expect, jest, test } from "@jest/globals";
import checkRepositoryFormatting from "../../src/preflight/format-check.mjs";

test("runs the format check with npm on non-Windows platforms", () => {
  const run = jest.fn().mockReturnValue({ status: 0 });

  expect(checkRepositoryFormatting("/router", { run, platform: "linux" })).toEqual({ ok: true });
  expect(run).toHaveBeenCalledWith("npm", ["run", "format:check"], {
    cwd: "/router",
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
});

test("runs the format check through cmd on Windows", () => {
  const run = jest.fn().mockReturnValue({ status: 0 });

  expect(checkRepositoryFormatting("C:/router", { run, platform: "win32" })).toEqual({ ok: true });
  expect(run).toHaveBeenCalledWith("cmd.exe", ["/d", "/s", "/c", "npm run format:check"], {
    cwd: "C:/router",
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
});

test.each([{ status: 1 }, { error: new Error("missing npm") }])(
  "reports a failed format command",
  (result) => {
    expect(checkRepositoryFormatting("/router", { run: () => result, platform: "linux" })).toEqual({
      ok: false,
    });
  },
);
