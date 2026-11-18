# AGENTS.md

## Project

See [README.md](README.md) for the purpose, owner, and scope of Core Networking Manager.

## Scope and boundaries

Keep project requirements and behavior in the specifications and maintained code.

## Layout

Use [README.md](README.md), [docs/README.md](docs/README.md), and [specs/README.md](specs/README.md) to find maintained files.

## Development

Use Node.js 26 or later and native ESM for maintained JavaScript modules.
Keep each source and test module focused on one responsibility.

## Validation

Run `npm ci` to install locked dependencies.
Run `npm test` for aggregate validation.
Run `npm run lint` for lint checks.
Run `npm run audit` to check dependencies for known vulnerabilities. Run `npm test` after changing dependency metadata.

Run `npm run format` to format maintained files. Then run `npm run format:check` and `npm test` to verify changes.
Run `npm run format:check` to check formatting without changing files.

Run `npm run pack` to check package contents and packaging rules.

## Security

Keep credentials, secrets, private data, and runtime state out of Git.

## Changes

Update user documentation and RELEASE_NOTES.md when user-visible behavior changes.

## Application

Run focused tests first during development.
Run one test file with `npm test -- tests/path/to/example.test.mjs`.
Run multiple test files with `npm test -- tests/path/to/first.test.mjs tests/path/to/second.test.mjs`.
Prevent repeated full-suite runs during development.
Run the full `npm test` suite for final validation before a commit, milestone, or release.

## CLI

Keep `--help` and `--version` read-only.
Document each command, argument, default, error, and exit code.

## Web

Keep route, asset, build, and deployment guidance aligned with maintained code and workflows.

## npm publication

Use `.github/workflows/npm.yaml` for package publication.
Follow the approved release process before publication.
