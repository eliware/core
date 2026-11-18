import { expect, test } from "@jest/globals";
import validateShell from "../../../src/preflight/text/shell.mjs";

test("checks shell interpreters, quoted text, and control blocks", () => {
  expect(validateShell("a.sh", "#!/bin/bash\nif true; then echo ok; fi\n")).toEqual([]);
  expect(validateShell("a.sh", "echo 'open\n").join(" ")).toContain("quoted string is not closed");
  expect(validateShell("a.sh", '#!/bin/bash\necho "a\\"b"\n')).toEqual([]);
  expect(validateShell("a.sh", "#!/usr/bin/env bash\nif true; then\n").join(" ")).toContain(
    "unmatched if keyword",
  );
  expect(validateShell("a.sh", "#!/bin/bash\ndone\n").join(" ")).toContain(
    "unmatched done keyword",
  );
  expect(validateShell("a.sh", "#!/bin/bash\necho ok # if ignored\n")).toEqual([]);
  expect(validateShell("a.sh", "echo ok\n").join(" ")).toContain("interpreter line is required");
});
