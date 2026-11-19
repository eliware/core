import parseArguments from "./arguments.mjs";
import reportUnknownArgument from "./errors.mjs";
import writeHelp from "./help.mjs";
import preflight from "./preflight.mjs";
import compare from "./compare.mjs";
import loadServiceCatalog from "./service-catalog/load.mjs";
import { resolve } from "node:path";
import checkCatalogStatus from "./cli/status.mjs";
import reloadCatalogComponents from "./cli/reload.mjs";
import runSystemCommand from "./cli/system-command.mjs";

export default async function runCli(
  args,
  {
    version,
    write = console.log,
    cwd = process.cwd(),
    preflightCommand = preflight,
    compareCommand = compare,
    catalogCommand = loadServiceCatalog,
    statusCommand = checkCatalogStatus,
    reloadCommand = reloadCatalogComponents,
    systemCommand = runSystemCommand,
  },
) {
  const parsed = parseArguments(args);
  if (parsed.type === "help") {
    writeHelp(write);
    return 0;
  }
  if (parsed.type === "version") {
    write(version);
    return 0;
  }

  if (parsed.type === "preflight") {
    const result = await preflightCommand(cwd);
    for (const line of result.lines) write(line);
    return result.ok ? 0 : 1;
  }

  if (parsed.type === "catalog") {
    let catalog;
    try {
      catalog = catalogCommand(cwd);
    } catch (error) {
      write(`Catalog error: ${error.message}`);
      return 1;
    }
    if (!catalog) {
      write("No service catalog is configured.");
      return 0;
    }
    for (const component of catalog.components)
      write(
        `${component.id} — ${component.name} | paths: ${component.configPaths.join(", ")} | health: ${component.health.unit} | action: ${component.action.operation} ${component.action.unit}`,
      );
    return 0;
  }

  if (parsed.type === "status" || parsed.type === "reload") {
    const repositoryPath = parsed.repositoryPath ? resolve(cwd, parsed.repositoryPath) : cwd;
    let catalog;
    try {
      catalog = catalogCommand(repositoryPath);
    } catch (error) {
      write(`Catalog error: ${error.message}`);
      return 1;
    }
    const command = parsed.type === "status" ? statusCommand : reloadCommand;
    const result = await command({ catalog, componentId: parsed.componentId, run: systemCommand });
    for (const line of result.lines) write(line);
    return result.usageError ? 2 : result.ok ? 0 : 1;
  }

  if (parsed.type === "compare") {
    const result = await compareCommand(cwd, parsed.partnerRepo);
    for (const line of result.lines) write(line);
    return result.ok ? 0 : 1;
  }

  if (parsed.type === "invalid") {
    write(`Invalid arguments for ${parsed.command}.`);
    return 2;
  }

  reportUnknownArgument(parsed.argument, write);
  return 2;
}
