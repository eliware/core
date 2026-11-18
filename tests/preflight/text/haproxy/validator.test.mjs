import { expect, test } from "@jest/globals";
import parseHaproxy from "../../../../src/preflight/text/haproxy/parser.mjs";
import validateHaproxy from "../../../../src/preflight/text/haproxy/validator.mjs";

function validate(text) {
  return validateHaproxy("haproxy.cfg", parseHaproxy("haproxy.cfg", text));
}

test("checks required sections, listeners, servers, and backend references", () => {
  expect(validateHaproxy("haproxy.cfg", { sections: [] })[0]).toContain(
    "global and defaults sections are required",
  );
  expect(
    validate("global\ndefaults\nfrontend web\n default_backend missing\nbackend empty\n"),
  ).toEqual([
    "FAIL haproxy.cfg: web needs a bind directive.",
    "FAIL haproxy.cfg: empty needs a server directive.",
    "FAIL haproxy.cfg: backend missing is not defined.",
  ]);
});

test("accepts a backend reference to a listen section", () => {
  expect(
    validate(
      "global\ndefaults\nfrontend web\n bind :80\n use_backend app\nlisten app\n bind :8080\n",
    ),
  ).toEqual([]);
});

test("rejects missing names, duplicate sections, unknown directives, and bad addresses", () => {
  expect(
    validate("global\nglobal\n defaults\nfrontend\n unknown value\nbackend api\n server api bad\n"),
  ).toEqual([
    "FAIL haproxy.cfg:2: duplicate global global.",
    "FAIL haproxy.cfg:4: frontend needs a name.",
    "FAIL haproxy.cfg:5: unknown frontend directive.",
    "FAIL haproxy.cfg:7: server needs a valid address and port.",
    "FAIL haproxy.cfg: frontend needs a bind directive.",
  ]);
});
