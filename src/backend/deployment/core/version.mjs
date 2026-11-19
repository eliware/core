import { readFile } from "node:fs/promises";
import { join } from "node:path";

export default async function readCoreVersion(repositoryPath, readMetadata) {
  try {
    const content = await (readMetadata ?? readFile)(
      join(repositoryPath, "node_modules", "@eliware", "core", "package.json"),
      "utf8",
    );
    const metadata = JSON.parse(content);
    return metadata.name === "@eliware/core" && typeof metadata.version === "string"
      ? metadata.version
      : null;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Could not read the installed Core package version: ${error.message}`);
  }
}
