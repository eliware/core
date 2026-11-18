import { expect, jest, test } from "@jest/globals";
import { resolve } from "node:path";
import loadRepository from "../../src/pair/repository.mjs";

function setup(packageContent, configContent = "configuration") {
  const root = resolve("/router");
  const files = ["package.json", "etc/router.conf", "README.md"];
  const contents = new Map([
    [`${root.replaceAll("\\", "/")}/package.json`, packageContent],
    [`${root.replaceAll("\\", "/")}/etc/router.conf`, configContent],
  ]);
  const readFile = jest.fn((path) => {
    const normalized = path.replaceAll("\\", "/");
    if (!contents.has(normalized)) throw new Error("missing file");
    return contents.get(normalized);
  });
  return { root, files, contents, readFile };
}

test("loads the package name and only configuration files", () => {
  const state = setup(JSON.stringify({ name: "@eliware/router" }));

  expect(loadRepository(state.root, state.files, state.readFile)).toEqual({
    name: "router",
    files: new Map([["etc/router.conf", "configuration"]]),
  });
  expect(state.readFile).toHaveBeenCalledTimes(2);
});

test("reports a missing package file", () => {
  expect(loadRepository("/router", ["etc/router.conf"], jest.fn())).toEqual({
    error: "package.json is missing.",
  });
});

test.each([
  ["invalid JSON", "package.json is not valid JSON."],
  ["{}", "package.json has no repository name."],
])("reports invalid package metadata %s", (content, error) => {
  const state = setup(content);
  expect(loadRepository(state.root, state.files, state.readFile)).toEqual({ error });
});

test("reports unreadable configuration files", () => {
  const state = setup(JSON.stringify({ name: "router" }));
  state.readFile.mockImplementation((path) => {
    if (path.endsWith("router.conf")) throw new Error("denied");
    return JSON.stringify({ name: "router" });
  });

  expect(loadRepository(state.root, state.files, state.readFile)).toEqual({
    error: "A configuration file could not be read.",
  });
});
