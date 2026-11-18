import { expect, jest, test } from "@jest/globals";
const defaultCollect = jest.fn();
const defaultRead = jest.fn();
const defaultRun = jest.fn();
jest.unstable_mockModule("../src/repo-files.mjs", () => ({ default: defaultCollect }));
jest.unstable_mockModule("node:fs", () => ({
  readFileSync: defaultRead,
  realpathSync: (path) => path,
}));
jest.unstable_mockModule("node:child_process", () => ({ spawnSync: defaultRun }));
const { default: preflight } = await import("../src/preflight.mjs");

function setup(overrides = {}) {
  const root = "C:/router";
  const packageJson = { name: "@eliware/core1", version: "15.2.0" };
  const contents = new Map([
    ["package.json", JSON.stringify(packageJson)],
    [
      "package-lock.json",
      JSON.stringify({
        name: packageJson.name,
        version: packageJson.version,
        packages: { "": { name: packageJson.name, version: packageJson.version } },
      }),
    ],
    ["specs/directives.yaml", "version: 1\n"],
    [
      "etc/kea/kea-dhcp4.conf",
      '{"Dhcp4":{"loggers":[{}],"subnet4":[{"id":1,"subnet":"10.0.0.0/24"}],"interfaces-config":{"interfaces":[]},"lease-database":{"type":"memfile"}}}',
    ],
    [
      "etc/sysconfig/iptables",
      "*filter\n:INPUT DROP [0:0]\n:FORWARD DROP [0:0]\n:OUTPUT ACCEPT [0:0]\nCOMMIT\n",
    ],
    [
      "etc/sysconfig/ip6tables",
      "*filter\n:INPUT DROP [0:0]\n:FORWARD DROP [0:0]\n:OUTPUT ACCEPT [0:0]\nCOMMIT\n",
    ],
    [
      "etc/systemd/system/core.service",
      "[Unit]\nDescription=Core test\n[Service]\nType=oneshot\nExecStart=/eliware/core1/scripts/check.sh\n",
    ],
    ["scripts/status.mjs", "console.log('ok');\n"],
    ["scripts/check.sh", "#!/usr/bin/env bash\ntrue\n"],
  ]);
  const files = [...contents.keys()];
  const collectFiles = jest.fn().mockReturnValue({ files });
  const readFile = jest.fn((path) => {
    const file = path.replaceAll("\\", "/").split("/router/").at(-1);
    if (!contents.has(file)) throw new Error("missing fixture");
    return contents.get(file);
  });
  const run = jest.fn().mockReturnValue({ status: 0, stdout: "" });
  const configValidator = jest.fn().mockReturnValue({
    lines: ["PASS Node.js configuration checks (5 files)"],
    errors: [],
  });
  return {
    root,
    contents,
    files,
    collectFiles,
    readFile,
    run,
    options: {
      collectFiles,
      readFile,
      run,
      nodePath: "node-test",
      platform: "linux",
      configValidator,
      ...overrides,
    },
  };
}

test("checks formatting, parsable files, scripts, and configuration with Node.js", async () => {
  const state = setup();

  const result = await preflight(state.root, state.options);

  expect(result.ok).toBe(true);
  expect(result.lines).toContain("PASS repository formatting");
  expect(result.lines).toContain("PASS JavaScript syntax (1 files)");
  expect(result.lines).toContain("PASS Bash syntax (1 files)");
  expect(result.lines).toContain("PASS parsed JSON, JSONC, and YAML (4 files)");
  expect(result.lines).toContain("PASS Node.js configuration checks (5 files)");
  expect(result.lines.some((line) => line.startsWith("SKIP"))).toBe(false);
  expect(state.run).toHaveBeenCalled();
  expect(state.run).toHaveBeenCalledWith(
    "bash",
    ["-n"],
    expect.objectContaining({ input: "#!/usr/bin/env bash\ntrue\n" }),
  );
  expect(state.root).toBe("C:/router");
});

test("runs identical configuration checks on Windows", async () => {
  const state = setup({ platform: "win32" });
  state.run.mockReturnValue({ error: { code: "ENOENT" } });
  state.run.mockImplementation((command) =>
    command === "cmd.exe" || command === "node-test" || command === "bash"
      ? { status: 0 }
      : { error: { code: "ENOENT" } },
  );

  const result = await preflight(state.root, state.options);

  expect(result.ok).toBe(true);
  expect(result.lines).toContain("PASS Node.js configuration checks (5 files)");
  expect(result.lines.some((line) => line.startsWith("SKIP"))).toBe(false);
});

test("reports parse, lock, formatting, script, and domain validation failures", async () => {
  const state = setup();
  state.options.configValidator.mockReturnValue({
    lines: [],
    errors: [
      "FAIL etc/sysconfig/iptables: filter table is required.",
      "FAIL scripts/check.sh: unmatched if keyword.",
    ],
  });
  state.contents.set("package-lock.json", "{}");
  state.contents.set("specs/directives.yaml", "broken: [\n");
  state.contents.set("etc/kea/kea-dhcp4.conf", '{"Dhcp4":');
  state.contents.set("etc/sysconfig/iptables", "*unknown\nCOMMIT\n");
  state.contents.set("scripts/check.sh", "#!/usr/bin/env bash\nif true; then\n");
  state.run.mockImplementation((command) => ({ status: command === "node-test" ? 1 : 1 }));

  const result = await preflight(state.root, state.options);

  expect(result.ok).toBe(false);
  expect(result.lines.some((line) => line.includes("invalid YAML syntax"))).toBe(true);
  expect(result.lines.some((line) => line.includes("invalid JSON syntax"))).toBe(true);
  expect(result.lines).toContain(
    "FAIL package.json and package-lock.json names or versions do not match.",
  );
  expect(result.lines).toContain("FAIL repository formatting check.");
  expect(result.lines).toContain("FAIL JavaScript syntax: scripts/status.mjs.");
  expect(result.lines).toContain("FAIL Bash syntax: scripts/check.sh.");
  expect(result.lines.some((line) => line.includes("filter table is required"))).toBe(true);
  expect(result.lines.some((line) => line.includes("unmatched if keyword"))).toBe(true);
});

test("fails shell validation when Bash is unavailable", async () => {
  const state = setup();
  state.run.mockImplementation((command) =>
    command === "bash" ? { error: { code: "ENOENT" } } : { status: 0 },
  );

  const result = await preflight(state.root, state.options);

  expect(result.ok).toBe(false);
  expect(result.lines).toContain("FAIL Bash syntax: scripts/check.sh.");
});

test("fails shell validation when a script cannot be read", async () => {
  const state = setup();
  state.readFile.mockImplementation((path) => {
    if (path.endsWith("check.sh")) throw new Error("denied");
    const file = path.replaceAll("\\", "/").split("/router/").at(-1);
    return state.contents.get(file);
  });

  const result = await preflight(state.root, state.options);

  expect(result.ok).toBe(false);
  expect(result.lines).toContain("FAIL Bash syntax: scripts/check.sh.");
});

test("reports missing repository files and read failures", async () => {
  const missing = setup();
  missing.collectFiles.mockReturnValue({ error: "not a repository" });
  await expect(preflight(missing.root, missing.options)).resolves.toEqual({
    ok: false,
    lines: ["FAIL not a repository"],
  });

  const unreadable = setup();
  unreadable.files.splice(0, unreadable.files.length, "package.json");
  unreadable.readFile.mockImplementation(() => {
    throw new Error("denied");
  });
  await expect(preflight(unreadable.root, unreadable.options)).resolves.toMatchObject({
    ok: false,
    lines: expect.arrayContaining(["FAIL package.json: could not read or parse the file."]),
  });

  const missingLock = setup();
  missingLock.files.splice(missingLock.files.indexOf("package-lock.json"), 1);
  const missingLockResult = await preflight(missingLock.root, missingLock.options);
  expect(missingLockResult.lines).toContain("FAIL package.json or package-lock.json is missing.");

  const badLock = setup();
  badLock.contents.set("package-lock.json", "invalid");
  const badLockResult = await preflight(badLock.root, badLock.options);
  expect(badLockResult.lines).toContain("FAIL package-lock.json is not valid JSON.");
});

test("uses the default repository, file, process, and platform helpers", async () => {
  const packageJson = { name: "@eliware/core1", version: "15.2.0" };
  const lock = {
    name: packageJson.name,
    version: packageJson.version,
    packages: { "": { name: packageJson.name, version: packageJson.version } },
  };
  defaultCollect.mockReturnValue({ files: ["package.json", "package-lock.json"] });
  defaultRead.mockImplementation((path) =>
    path.endsWith("package.json") ? JSON.stringify(packageJson) : JSON.stringify(lock),
  );
  defaultRun.mockReturnValue({ status: 0, stdout: "" });

  const result = await preflight("C:/router");

  expect(defaultCollect).toHaveBeenCalledWith("C:/router");
  expect(defaultRun).toHaveBeenCalled();
  expect(result.ok).toBe(false);
  defaultCollect.mockReset();
  defaultRead.mockReset();
  defaultRun.mockReset();
});
