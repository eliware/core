import { expect, test } from "@jest/globals";
import parseHaproxy from "../../../../src/preflight/text/haproxy/parser.mjs";

test("parses HAProxy sections, directives, and references", () => {
  const parsed = parseHaproxy(
    "haproxy.cfg",
    "global\ndefaults\nfrontend web\n bind 0.0.0.0:443\n default_backend app\nbackend app\n server one 127.0.0.1:8080\n",
  );
  expect(parsed.errors).toEqual([]);
  expect(parsed.sections.get("frontend:web")).toEqual({ bound: true, serverCount: 0 });
  expect(parsed.sections.get("backend:app")).toEqual({ bound: false, serverCount: 1 });
  expect(parsed.references).toEqual(["app"]);
});

test("reports malformed sections and directives", () => {
  const parsed = parseHaproxy(
    "haproxy.cfg",
    "frontend\nfrontend\nunknown\nglobal\nunknown global\ndefaults\nserver bad bad\n",
  );
  expect(parsed.errors.join(" ")).toContain("frontend needs a name");
  expect(parsed.errors.join(" ")).toContain("duplicate frontend frontend");
  expect(parseHaproxy("haproxy.cfg", "unknown before section\n").errors.join(" ")).toContain(
    "setting appears before a section",
  );
  expect(parsed.errors.join(" ")).toContain("unknown global directive");
  expect(parsed.errors.join(" ")).toContain("server needs a valid address and port");
});
