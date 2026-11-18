#!/usr/bin/env node
import packageJson from "../package.json" with { type: "json" };
import { runtimeDependencies } from "../src/backend/runtime/wiring.mjs";
import startWebApplication from "../src/backend/main.mjs";

const [argument, ...extraArguments] = process.argv.slice(2);

if (extraArguments.length > 0 || (argument && !["--help", "--version"].includes(argument))) {
  process.stderr.write(`Unsupported argument: ${argument}\n`);
  process.exitCode = 2;
} else if (argument === "--help") {
  process.stdout.write("Usage: core-web [--help|--version]\nStart the Core web application.\n");
} else if (argument === "--version") {
  process.stdout.write(`${packageJson.version}\n`);
} else {
  await startWebApplication(runtimeDependencies);
}
