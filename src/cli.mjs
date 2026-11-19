import parseArguments from "./arguments.mjs";
import formatCliError from "./cli/error-output.mjs";
import writeHelp from "./help.mjs";
import preflight from "./preflight.mjs";
import compare from "./compare.mjs";
import loadServiceCatalog from "./service-catalog/load.mjs";
import checkCatalogStatus from "./cli/status.mjs";
import reloadCatalogComponents from "./cli/reload.mjs";
import runSystemCommand from "./cli/system-command.mjs";
import runCatalogCommand from "./cli/commands/catalog.mjs";
import runStatusCommand from "./cli/commands/status.mjs";
import runReloadCommand from "./cli/commands/reload.mjs";
import runCompareCommand from "./cli/commands/compare.mjs";

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
    const result = runCatalogCommand(cwd, catalogCommand);
    for (const line of result.lines) write(line);
    return result.ok ? 0 : 1;
  }

  if (["status", "reload"].includes(parsed.type)) {
    const command = parsed.type === "status" ? runStatusCommand : runReloadCommand;
    const operation = parsed.type === "status" ? { statusCommand } : { reloadCommand };
    const result = await command(parsed, { cwd, catalogCommand, systemCommand, ...operation });
    for (const line of result.lines) write(line);
    return result.usageError ? 2 : result.ok ? 0 : 1;
  }

  if (parsed.type === "compare") {
    const result = await runCompareCommand(parsed, { cwd, compareCommand });
    for (const line of result.lines) write(line);
    return result.ok ? 0 : 1;
  }

  if (parsed.type === "invalid") {
    write(formatCliError("invalid", parsed.command));
    return 2;
  }

  write(formatCliError("unknown", parsed.argument));
  return 2;
}
