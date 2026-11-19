import { expect, jest, test } from "@jest/globals";
import runCompareCommand from "../../../src/cli/commands/compare.mjs";

test("runs comparison for the requested partner repository", () => {
  const compareCommand = jest.fn().mockReturnValue({ ok: true, lines: ["PASS pair"] });
  const parsed = { partnerRepo: "../partner" };
  expect(runCompareCommand(parsed, { cwd: "/router", compareCommand })).toEqual({
    ok: true,
    lines: ["PASS pair"],
  });
  expect(compareCommand).toHaveBeenCalledWith("/router", "../partner");
});
