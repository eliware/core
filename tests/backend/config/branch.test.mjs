import { expect, test } from "@jest/globals";
import validateBranch from "../../../src/backend/config/branch.mjs";

test("uses the default branch and accepts branch names", () => {
  expect(validateBranch()).toBe("main");
  expect(validateBranch("release/15.x")).toBe("release/15.x");
});

test.each(["--delete", "feature..oops", "bad branch", "feature/--upload-pack=malicious"])(
  "rejects invalid branch name %s",
  (branch) => {
    expect(() => validateBranch(branch)).toThrow("CORE_GITHUB_BRANCH");
  },
);
