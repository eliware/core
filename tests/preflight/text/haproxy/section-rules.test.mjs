import { expect, test } from "@jest/globals";
import validateSectionRules from "../../../../src/preflight/text/haproxy/section-rules.mjs";

test("checks required sections, binds, servers, and backend references", () => {
  expect(
    validateSectionRules(
      "haproxy.cfg",
      new Map([
        ["frontend:web", { bound: false, serverCount: 0 }],
        ["backend:empty", { bound: false, serverCount: 0 }],
      ]),
      ["missing"],
    ),
  ).toEqual([
    "FAIL haproxy.cfg: global and defaults sections are required.",
    "FAIL haproxy.cfg: web needs a bind directive.",
    "FAIL haproxy.cfg: empty needs a server directive.",
    "FAIL haproxy.cfg: backend missing is not defined.",
  ]);
});

test("accepts a backend reference to a listen section", () => {
  expect(
    validateSectionRules(
      "haproxy.cfg",
      new Map([
        ["global:global", {}],
        ["defaults:defaults", {}],
        ["listen:app", {}],
      ]),
      ["app"],
    ),
  ).toEqual([]);
});
