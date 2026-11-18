import { spawnSync } from "node:child_process";

export default function listRepositoryFiles(root, { run = spawnSync } = {}) {
  const result = run(
    "git",
    ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (result.error) return { error: `Could not list repository files: ${result.error.message}` };
  if (result.status !== 0) return { error: "Could not list repository files with Git." };

  return {
    files: result.stdout
      .split("\0")
      .filter(Boolean)
      .map((file) => file.replaceAll("\\", "/"))
      .sort(),
  };
}
