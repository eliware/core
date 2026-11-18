import { expect, test } from "@jest/globals";
import validateHaproxy from "../../../src/preflight/text/haproxy.mjs";

test("checks HAProxy sections, commands, addresses, and backend references", () => {
  const valid =
    "global\n maxconn 10\ndefaults\n mode tcp\nfrontend web\n bind 0.0.0.0:443\n default_backend app\nbackend app\n server node 127.0.0.1:8080\n";
  expect(validateHaproxy("haproxy.cfg", valid)).toEqual([]);
  const invalid =
    "bad setting\nfrontend\n bind\n unknown item\nbackend app\n server node bad\n use_backend missing\nbackend empty\nfrontend\n";
  const errors = validateHaproxy("haproxy.cfg", invalid).join(" ");
  expect(errors).toContain("setting appears before a section");
  expect(errors).toContain("needs a name");
  expect(errors).toContain("unknown frontend directive");
  expect(errors).toContain("needs a bind directive");
  expect(errors).toContain("needs a server directive");
  expect(errors).toContain("backend missing is not defined");
  expect(errors).toContain("server needs a valid address and port");
});
