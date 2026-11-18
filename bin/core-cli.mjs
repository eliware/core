#!/usr/bin/env node
import packageJson from "../package.json" with { type: "json" };
import runCli from "../src/cli.mjs";

process.exitCode = await runCli(process.argv.slice(2), {
  version: packageJson.version,
  write: (text) => process.stdout.write(`${text}\n`),
});
