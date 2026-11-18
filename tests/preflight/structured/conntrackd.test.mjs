import { expect, test } from "@jest/globals";
import validateConntrackd from "../../../src/preflight/structured/conntrackd.mjs";

test("requires balanced Sync and General blocks", () => {
  expect(validateConntrackd("etc/conntrackd/conntrackd.conf", "Sync { }\nGeneral { }")).toEqual([]);
  expect(validateConntrackd("etc/conntrackd/conntrackd.conf", "broken")[0]).toContain(
    "Sync and General blocks",
  );
  expect(
    validateConntrackd(
      "etc/conntrackd/conntrackd.conf",
      'Sync { Note "escaped \\\" brace }"; } General { }',
    ),
  ).toEqual([]);
});
