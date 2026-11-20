import findAffectedComponents from "../../service-catalog/affected-components.mjs";
import listCatalogActions from "../../service-catalog/actions.mjs";

export default async function planCatalogActions({ catalog, repositoryPath, previousCommit, run }) {
  const result = await run("git", ["diff", "--name-status", "-z", previousCommit, "HEAD", "--"], {
    cwd: repositoryPath,
    encoding: "utf8",
  });
  const entries = String(result.stdout ?? "").split("\0");
  const files = [];
  for (let index = 0; index < entries.length - 1;) {
    const status = entries[index++];
    if (status.startsWith("R") || status.startsWith("C")) {
      files.push(entries[index++], entries[index++]);
    } else {
      files.push(entries[index++]);
    }
  }
  return listCatalogActions(findAffectedComponents(catalog, files.filter(Boolean)));
}
