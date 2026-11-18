import { expect, jest, test } from "@jest/globals";
import { relative, resolve } from "node:path";
import createPairRepo from "../test-fixtures/core-pair.mjs";
import compareRepositories from "../src/compare.mjs";

function setup() {
  const root = resolve("C:/router/core1");
  const partnerRoot = resolve(root, "../core2");
  const repositories = new Map([
    [root, createPairRepo("core1")],
    [partnerRoot, createPairRepo("core2")],
  ]);
  const collectFiles = jest.fn((repoRoot) => {
    const repo = repositories.get(resolve(repoRoot));
    return repo ? { files: Object.keys(repo) } : { error: "not a repository" };
  });
  const readFile = jest.fn((filePath) => {
    for (const [repoRoot, repo] of repositories) {
      const file = relative(repoRoot, filePath).replaceAll("\\", "/");
      if (Object.hasOwn(repo, file)) return repo[file];
    }
    throw new Error("missing file");
  });
  return { root, partnerRoot, repositories, collectFiles, readFile };
}

test("compares the whole pair and reports expected HA differences", () => {
  const state = setup();

  const result = compareRepositories(state.root, "../core2", state);

  expect(result.ok).toBe(true);
  expect(result.lines).toContain("PASS matching configuration inventory (7 files)");
  expect(result.lines).toContain("PASS reciprocal FRR, Kea, Keepalived, and conntrackd settings");
  expect(result.lines).toContain("PASS expected HA differences (6 files)");
});

test("supports comparison from the partner repository", () => {
  const state = setup();

  const result = compareRepositories(state.partnerRoot, "../core1", state);

  expect(result.ok).toBe(true);
});

test("uses default file helpers and detects a partner-only file", () => {
  expect(compareRepositories(process.cwd(), ".").lines[0]).toContain("different directory");

  const state = setup();
  state.repositories.get(state.partnerRoot)["scripts/extra.sh"] = "true\n";
  const result = compareRepositories(state.root, "../core2", state);
  expect(result.lines.join(" ")).toContain("This repo is missing scripts/extra.sh");
});

test("rejects the same repo, missing repos, and invalid repo metadata", () => {
  const same = setup();
  expect(compareRepositories(same.root, ".", same).lines[0]).toContain("different directory");

  const missing = setup();
  missing.collectFiles.mockReturnValueOnce({ error: "no Git repo" });
  expect(compareRepositories(missing.root, "../core2", missing).lines[0]).toContain("This repo");

  const partnerMissing = setup();
  partnerMissing.collectFiles.mockReturnValueOnce({ files: Object.keys(createPairRepo("core1")) });
  partnerMissing.collectFiles.mockReturnValueOnce({ error: "not found" });
  expect(compareRepositories(partnerMissing.root, "../core2", partnerMissing).lines[0]).toContain(
    "Partner repo",
  );

  const invalid = setup();
  invalid.repositories.get(invalid.root)["package.json"] = "bad JSON";
  expect(compareRepositories(invalid.root, "../core2", invalid).lines[0]).toContain(
    "not valid JSON",
  );

  const noPackage = setup();
  delete noPackage.repositories.get(noPackage.root)["package.json"];
  expect(compareRepositories(noPackage.root, "../core2", noPackage).lines.join(" ")).toContain(
    "package.json is missing",
  );

  const noName = setup();
  noName.repositories.get(noName.root)["package.json"] = JSON.stringify({});
  expect(compareRepositories(noName.root, "../core2", noName).lines.join(" ")).toContain(
    "no repository name",
  );

  const partnerInvalid = setup();
  partnerInvalid.repositories.get(partnerInvalid.partnerRoot)["package.json"] = "bad JSON";
  expect(
    compareRepositories(partnerInvalid.root, "../core2", partnerInvalid).lines.join(" "),
  ).toContain("package.json is not valid JSON");
});

test("reports file inventory and unapproved content differences", () => {
  const missingFile = setup();
  delete missingFile.repositories.get(missingFile.partnerRoot)["etc/named.rfc1912.zones"];
  const missingResult = compareRepositories(missingFile.root, "../core2", missingFile);
  expect(missingResult.ok).toBe(false);
  expect(missingResult.lines.some((line) => line.includes("missing etc/named.rfc1912.zones"))).toBe(
    true,
  );

  const content = setup();
  content.repositories.get(content.partnerRoot)["etc/named.rfc1912.zones"] =
    'zone "wrong.test" {};\n';
  const result = compareRepositories(content.root, "../core2", content);
  expect(result.lines.some((line) => line.includes("Unexpected configuration difference"))).toBe(
    true,
  );

  const kea = setup();
  kea.repositories.get(kea.partnerRoot)["etc/kea/kea-dhcp4.conf"] = kea.repositories
    .get(kea.partnerRoot)
    ["etc/kea/kea-dhcp4.conf"].replace('"Dhcp4": {', '"Dhcp4": {\n    "valid-lifetime": 3600,');
  expect(compareRepositories(kea.root, "../core2", kea).lines.join(" ")).toContain(
    "Unexpected configuration difference: etc/kea/kea-dhcp4.conf.",
  );
});

test("accepts generic pair names and reports unreadable config files", () => {
  const unsupported = setup();
  unsupported.repositories.get(unsupported.partnerRoot)["package.json"] = JSON.stringify({
    name: "@eliware/other",
  });
  expect(compareRepositories(unsupported.root, "../core2", unsupported).ok).toBe(true);

  const unreadable = setup();
  unreadable.repositories.get(unreadable.root)["package.json"] = "bad JSON";
  expect(compareRepositories(unreadable.root, "../core2", unreadable).lines.join(" ")).toContain(
    "not valid JSON",
  );

  const unreadableConfig = setup();
  unreadableConfig.readFile.mockImplementation((path) => {
    if (path.endsWith("named.rfc1912.zones")) throw new Error("denied");
    return setup().readFile(path);
  });
  expect(
    compareRepositories(unreadableConfig.root, "../core2", unreadableConfig).lines.join(" "),
  ).toContain("could not be read");
});

test("rejects repositories with the same package name", () => {
  const state = setup();
  state.repositories.get(state.root)["package.json"] = JSON.stringify({ name: "@eliware/core2" });
  const result = compareRepositories(state.root, "../core2", state);
  expect(result.ok).toBe(false);
  expect(result.lines.join(" ")).toContain("different package names");
});
