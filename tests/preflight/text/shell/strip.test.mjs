import { expect, test } from "@jest/globals";
import stripShellText from "../../../../src/preflight/text/shell/strip.mjs";

test("removes quoted text and comments while keeping control syntax", () => {
  expect(stripShellText('if echo "quoted \\\" text"; then # if ignored\nfi\n')).toBe(
    "if echo                 ; then             \nfi\n",
  );
  expect(stripShellText("echo \\\nnext\n")).toBe("echo next\n");
  expect(stripShellText("echo 'single # quoted'\n")).not.toContain("#");
});
