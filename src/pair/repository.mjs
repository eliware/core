import { resolve } from "node:path";

export default function loadRepository(root, allFiles, readFile) {
  if (!allFiles.includes("package.json")) return { error: "package.json is missing." };
  let packageJson;
  try {
    packageJson = JSON.parse(readFile(resolve(root, "package.json"), "utf8"));
  } catch {
    return { error: "package.json is not valid JSON." };
  }
  const name = packageJson.name?.split("/").at(-1);
  if (!name) return { error: "package.json has no repository name." };
  const paths = allFiles.filter((file) => /^(etc|var|scripts)\//u.test(file));
  try {
    return {
      name,
      files: new Map(paths.map((file) => [file, readFile(resolve(root, file), "utf8")])),
    };
  } catch {
    return { error: "A configuration file could not be read." };
  }
}
