import { resolve } from "node:path";

export default function validatePackageMetadata(packageJson, files, root, readFile) {
  if (!packageJson || !files.includes("package-lock.json"))
    return ["FAIL package.json or package-lock.json is missing."];

  try {
    const lock = JSON.parse(readFile(resolve(root, "package-lock.json"), "utf8"));
    if (
      lock.name !== packageJson.name ||
      lock.version !== packageJson.version ||
      lock.packages?.[""]?.name !== packageJson.name ||
      lock.packages?.[""]?.version !== packageJson.version
    ) {
      return ["FAIL package.json and package-lock.json names or versions do not match."];
    }
    return [];
  } catch {
    return ["FAIL package-lock.json is not valid JSON."];
  }
}
