# CLI guide

The `core-cli` command prints help or the package version. The command does not change files or connect to a network.

## Install and run

Install Node.js 26 or later and npm 12 or later. Run `npm ci` in the repository root.

Run `core-cli --help` to show usage. Run `core-cli --version` to show the package version. Run `core-cli` with no arguments to show help.

The CLI accepts no other arguments. An unsupported argument prints an error and returns exit code 2. Help and version commands return exit code 0.

## Change command behavior

The executable is `bin/core-cli.mjs`. The parser and command behavior live in `src/cli.mjs`. Tests live in `tests/cli.test.mjs`.

Add commands only when the application needs them. Document their arguments, defaults, errors, and exit codes. Add controls before a command can delete data or change external state.

## Release

The repository includes an npm publication workflow. Match the package version with its `vMAJOR.MINOR.PATCH` Git tag. Follow the approved release process before publication.

## Validate

Run `npm test` before handoff. It runs tests, lint, formatting, audit, package checks, and profile checks.
