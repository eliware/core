import { expect, test } from "@jest/globals";
import maskCommentsAndStrings from "../../../src/pair/keepalived/mask.mjs";

test("masks comments and strings while preserving source positions", () => {
  const source = 'state MASTER # vrrp_instance fake {\nnotify "/bin/echo { fake }"\n';
  const masked = maskCommentsAndStrings(source);
  expect(masked).toHaveLength(source.length);
  expect(masked.split("\n")).toHaveLength(source.split("\n").length);
  expect(masked).toContain("state MASTER");
  expect(masked).not.toContain("fake");
  expect(masked).not.toContain("{");
});

test("masks escaped quotes and hash characters inside single and double quotes", () => {
  const slash = String.fromCharCode(92);
  const source = `one "escaped ${slash}" quote # text" two 'escaped ${slash}' quote # text' # tail\n`;
  const masked = maskCommentsAndStrings(source);
  expect(masked).toHaveLength(source.length);
  expect(masked).toContain("one");
  expect(masked).toContain("two");
  expect(masked).not.toContain("text");
  expect(masked).not.toContain("tail");
});

test.each(['"unfinished { text', "'unfinished # text", "# unfinished { comment"])(
  "masks unterminated text %s",
  (source) => {
    const masked = maskCommentsAndStrings(source);
    expect(masked).toHaveLength(source.length);
    expect(masked).not.toContain("unfinished");
  },
);
