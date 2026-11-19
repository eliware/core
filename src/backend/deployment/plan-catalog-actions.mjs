import findAffectedComponents from "../../service-catalog/affected-components.mjs";
import listCatalogActions from "../../service-catalog/actions.mjs";

export default async function planCatalogActions({ catalog, repositoryPath, previousCommit, run }) {
  const result = await run("git", ["diff", "--name-only", previousCommit, "HEAD", "--"], {
    cwd: repositoryPath,
    encoding: "utf8",
  });
  const files = String(result.stdout ?? "")
    .split(/\r?\n/u)
    .filter(Boolean);
  return listCatalogActions(findAffectedComponents(catalog, files));
}
