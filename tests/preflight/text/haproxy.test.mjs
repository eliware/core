import { expect, test } from "@jest/globals";
import validateHaproxy from "../../../src/preflight/text/haproxy.mjs";

test("validates HAProxy sections and references", () => {
  const valid =
    "global\n maxconn 100\ndefaults\n mode tcp\nfrontend web\n bind 0.0.0.0:443\n default_backend app\nbackend app\n server one 127.0.0.1:8080\n";
  expect(validateHaproxy("haproxy.cfg", valid)).toEqual([]);
  expect(
    validateHaproxy("haproxy.cfg", "frontend web\n default_backend missing\nbackend empty\n").join(
      " ",
    ),
  ).toContain("backend missing is not defined");
  expect(
    validateHaproxy(
      "haproxy.cfg",
      "global\ndefaults\nfrontend web\n bind\nbackend app\n server bad bad\n",
    ).join(" "),
  ).toContain("server needs a valid address and port");
  const errors = validateHaproxy(
    "haproxy.cfg",
    "frontend\nfrontend\nunknown before section\nglobal\nunknown global\ndefaults\nbackend\nbackend\nserver bad bad\n",
  ).join(" ");
  expect(errors).toContain("frontend needs a name");
  expect(errors).toContain("duplicate frontend frontend");
  expect(validateHaproxy("haproxy.cfg", "unknown before section\n").join(" ")).toContain(
    "setting appears before a section",
  );
  expect(errors).toContain("unknown global directive");
  expect(errors).toContain("backend needs a name");
  expect(errors).toContain("server needs a valid address and port");
  expect(validateHaproxy("haproxy.cfg", "frontend\n").join(" ")).toContain(
    "global and defaults sections are required",
  );
});
