import { expect, test } from "@jest/globals";
import parseConfigFile from "../src/config-parser.mjs";

test("parses YAML and JSON files", () => {
  expect(parseConfigFile("specs/directives.yaml", "value: 1\n")).toEqual({
    value: { value: 1 },
    supported: true,
  });
  expect(parseConfigFile("package.json", '{"version":"1.0.0"}')).toEqual({
    value: { version: "1.0.0" },
    supported: true,
  });
});

test("parses JSONC Kea files with comments and trailing commas", () => {
  expect(parseConfigFile("etc/kea/kea-dhcp4.conf", '{\n// comment\n"Dhcp4": {},\n}')).toEqual({
    value: { Dhcp4: {} },
    supported: true,
  });
});

test("reports YAML and JSONC syntax errors", () => {
  expect(parseConfigFile("specs/directives.yaml", "broken: [\n").error).toBe("invalid YAML syntax");
  expect(parseConfigFile("etc/kea/kea-dhcp4.conf", '{"Dhcp4":')).toMatchObject({
    error: expect.stringContaining("invalid JSON syntax"),
  });
});

test("leaves router configuration formats to domain validators", () => {
  expect(parseConfigFile("etc/frr/frr.conf", "router bgp 65001\n")).toEqual({
    supported: false,
  });
});
