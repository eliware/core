export default function checkRepositoryFormatting(root, { run, platform }) {
  const command = platform === "win32" ? "cmd.exe" : "npm";
  const args =
    platform === "win32" ? ["/d", "/s", "/c", "npm run format:check"] : ["run", "format:check"];
  const result = run(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  return { ok: !result.error && result.status === 0 };
}
