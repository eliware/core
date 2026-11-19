import { resolve } from "node:path";
import formatCliError from "../error-output.mjs";

export default async function runStatusCommand(
  parsed,
  { cwd, catalogCommand, statusCommand, systemCommand },
) {
  const repositoryPath = parsed.repositoryPath ? resolve(cwd, parsed.repositoryPath) : cwd;
  let catalog;
  try {
    catalog = catalogCommand(repositoryPath);
  } catch (error) {
    return { ok: false, lines: [formatCliError("catalog", error)] };
  }
  return statusCommand({ catalog, componentId: parsed.componentId, run: systemCommand });
}
