import { expect, test } from "@jest/globals";
import validateHaproxy from "../../../../src/preflight/text/haproxy/validator.mjs";

test("checks required sections, listeners, servers, and backend references", () => {
  expect(validateHaproxy("haproxy.cfg", { sections: new Map(), references: [] })[0]).toContain(
    "global and defaults sections are required",
  );
  const errors = validateHaproxy("haproxy.cfg", {
    sections: new Map([
      ["global:global", {}],
      ["defaults:defaults", {}],
      ["frontend:web", { bound: false }],
      ["backend:empty", { serverCount: 0 }],
    ]),
    references: ["missing"],
  });
  expect(errors).toEqual([
    "FAIL haproxy.cfg: web needs a bind directive.",
    "FAIL haproxy.cfg: empty needs a server directive.",
    "FAIL haproxy.cfg: backend missing is not defined.",
  ]);
});

test("accepts a backend reference to a listen section", () => {
  expect(
    validateHaproxy("haproxy.cfg", {
      sections: new Map([
        ["global:global", {}],
        ["defaults:defaults", {}],
        ["listen:app", {}],
      ]),
      references: ["app"],
    }),
  ).toEqual([]);
});
