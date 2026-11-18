import { expect, test } from "@jest/globals";
import parseHaproxy from "../../../../src/preflight/text/haproxy/parser.mjs";

test("parses HAProxy sections and their directives", () => {
  const parsed = parseHaproxy(
    "haproxy.cfg",
    "global\ndefaults\nfrontend web\n bind 0.0.0.0:443\n default_backend app\nbackend app\n server one 127.0.0.1:8080\n",
  );

  expect(parsed.errors).toEqual([]);
  expect(parsed.sections).toEqual([
    { kind: "global", name: "", line: 1, directives: [] },
    { kind: "defaults", name: "", line: 2, directives: [] },
    {
      kind: "frontend",
      name: "web",
      line: 3,
      directives: [
        { value: "bind 0.0.0.0:443", line: 4 },
        { value: "default_backend app", line: 5 },
      ],
    },
    {
      kind: "backend",
      name: "app",
      line: 6,
      directives: [{ value: "server one 127.0.0.1:8080", line: 7 }],
    },
  ]);
});

test("reports directives that appear before a section", () => {
  expect(parseHaproxy("haproxy.cfg", "unknown before section\n").errors).toEqual([
    "FAIL haproxy.cfg:1: setting appears before a section.",
  ]);
});
