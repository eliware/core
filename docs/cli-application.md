# CLI guide

The `core-cli` command checks router configuration repositories. It does not change router files or reload services.

## Install and run

Install Node.js 26 or later and npm 12 or later. Run `npm ci` in the repository root.

Run `core-cli --help` to show usage. Run `core-cli --version` to show the package version.
Run `core-cli preflight` to check the current router repository.
Run `core-cli compare <partner repo>` to check the Core1 and Core2 pair.
Run `core-cli` with no arguments to show help.

`preflight` checks required router files and supported JSON, JSONC, YAML, JavaScript, and router settings with Node.js.
It checks DNS, Kea, WireGuard, firewall, FRR, HAProxy, Keepalived, systemd, Chrony, and shell structure. It uses `bash -n` for shell syntax.
It returns exit code 1 when a check fails.

`compare` accepts one partner repository path relative to the current repository. It checks matching config files and reciprocal HA settings.
It returns exit code 1 when the pair fails validation. Invalid syntax or unsupported arguments return exit code 2.
Help and version commands return exit code 0.

## Change command behavior

The executable is `bin/core-cli.mjs`. The parser and command behavior live in `src/cli.mjs`. Tests live in `tests/cli.test.mjs`.

Add commands only when the application needs them. Document their arguments, defaults, errors, and exit codes. Add controls before a command can delete data or change external state.

## Release

The repository includes an npm publication workflow. Match the package version with its `vMAJOR.MINOR.PATCH` Git tag. Follow the approved release process before publication.

## Validate

Run `npm test` before handoff. It runs tests, lint, formatting, audit, package checks, and profile checks.
