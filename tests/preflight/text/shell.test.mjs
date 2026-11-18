import { expect, test } from "@jest/globals";
import validateShell from "../../../src/preflight/text/shell.mjs";

test("checks shell interpreter lines, quotes, and control blocks", () => {
  expect(
    validateShell(
      "one.sh",
      "#!/bin/bash\ncase x in x) if true; then for a in b; do echo ok; done; fi ;; esac\n",
    ),
  ).toEqual([]);
  expect(validateShell("two.sh", "#!/usr/bin/env bash\nwhile true; do\n").join(" ")).toContain(
    "unmatched while keyword",
  );
  expect(validateShell("three.sh", "echo 'open\n").join(" ")).toContain(
    "quoted string is not closed",
  );
  expect(validateShell("four.sh", "echo ok\n").join(" ")).toContain(
    "shell interpreter line is required",
  );
  expect(validateShell("five.sh", "#!/bin/bash\ndone\n").join(" ")).toContain(
    "unmatched done keyword",
  );
  expect(validateShell("six.sh", '#!/bin/bash\necho "a\\"b" # case fake\n')).toEqual([]);
});
