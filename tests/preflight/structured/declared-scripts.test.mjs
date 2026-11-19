import { expect, test } from "@jest/globals";
import validateDeclaredScripts from "../../../src/preflight/structured/declared-scripts.mjs";

const file = "etc/keepalived/keepalived.conf";

test("checks managed and Keepalived script declarations", () => {
  const text = [
    'vrrp_script check { script "/eliware/router/scripts/check.sh" }',
    "vrrp_script local { script /etc/keepalived/local.sh }",
  ].join("\n");
  expect(
    validateDeclaredScripts(file, text, ["scripts/check.sh", "etc/keepalived/local.sh"]),
  ).toEqual([]);
  expect(validateDeclaredScripts(file, text, [])).toEqual([
    `FAIL ${file}: referenced scripts/check.sh script is missing.`,
    `FAIL ${file}: referenced etc/keepalived/local.sh script is missing.`,
  ]);
});

test("ignores script declarations outside managed paths", () => {
  expect(validateDeclaredScripts(file, "vrrp_script system { script /usr/bin/true }", [])).toEqual(
    [],
  );
});
