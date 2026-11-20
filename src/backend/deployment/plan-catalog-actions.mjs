import findAffectedComponents from "../../service-catalog/affected-components.mjs";
import listCatalogActions from "../../service-catalog/actions.mjs";
import parseChangedPaths from "./catalog/changed-paths.mjs";

export default async function planCatalogActions({ catalog, repositoryPath, previousCommit, run }) {
  const result = await run("git", ["diff", "--name-status", "-z", previousCommit, "HEAD", "--"], {
    cwd: repositoryPath,
    encoding: "utf8",
  });
  return listCatalogActions(findAffectedComponents(catalog, parseChangedPaths(result.stdout)));
}
