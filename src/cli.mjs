import parseArguments from "./arguments.mjs";
import reportUnknownArgument from "./errors.mjs";
import writeHelp from "./help.mjs";
import preflight from "./preflight.mjs";
import compare from "./compare.mjs";
import loadServiceCatalog from "./service-catalog/load.mjs";

export default async function runCli(
  args,
  {
    version,
    write = console.log,
    cwd = process.cwd(),
    preflightCommand = preflight,
    compareCommand = compare,
    catalogCommand = loadServiceCatalog,
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
    const catalog = catalogCommand(cwd);
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

  if (parsed.type === "compare") {
    const result = await compareCommand(cwd, parsed.partnerRepo);
    for (const line of result.lines) write(line);
    return result.ok ? 0 : 1;
  }

  reportUnknownArgument(parsed.argument, write);
  return 2;
}
