import findAffectedComponents from "../../service-catalog/affected-components.mjs";
import listCatalogActions from "../../service-catalog/actions.mjs";

export default async function planCatalogActions({ catalog, repositoryPath, previousCommit, run }) {
  const result = await run(
    "git",
    ["diff", "--no-renames", "--name-only", "-z", previousCommit, "HEAD", "--"],
    { cwd: repositoryPath, encoding: "utf8" },
  );
  const files = String(result.stdout ?? "")
    .split("\0")
    .filter(Boolean);
  return listCatalogActions(findAffectedComponents(catalog, files));
}
