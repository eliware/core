import parseArguments from "./arguments.mjs";
import reportUnknownArgument from "./errors.mjs";
import writeHelp from "./help.mjs";
import preflight from "./preflight.mjs";
import compare from "./compare.mjs";

export default async function runCli(
  args,
  {
    version,
    write = console.log,
    cwd = process.cwd(),
    preflightCommand = preflight,
    compareCommand = compare,
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

  if (parsed.type === "compare") {
    const result = await compareCommand(cwd, parsed.partnerRepo);
    for (const line of result.lines) write(line);
    return result.ok ? 0 : 1;
  }

  reportUnknownArgument(parsed.argument, write);
  return 2;
}
