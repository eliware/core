# AGENTS.md

## Project

This repository maintains Core Networking Manager, an npm package with CLI and web applications.

## Scope and boundaries

Keep component requirements in specifications and application behavior in maintained code.

## Layout

Use [README.md](README.md), [docs/README.md](docs/README.md), and [specs/README.md](specs/README.md) to find maintained guidance.

## Development

Use Node.js 26 or later and native ESM for maintained JavaScript modules.

## Validation

Run `npm run lint` to check source code.
Run `npm run audit` to check dependencies.
Run `npm run format` to format maintained files.
Run `npm run format:check` to check formatting.

## Security

Keep credentials, secrets, private data, and runtime state out of Git.

## Changes

Update user documentation and release notes when user-visible behavior changes.

## Application

Keep launchers in `bin/`, implementation modules in `src/`, tests in `tests/`, and fixtures in `test-fixtures/`.
Run focused tests first during development.
Prevent repeated full-suite runs during development.
Run one test file with `npm test -- tests/path/to/example.test.mjs`.
Run multiple test files with `npm test -- tests/path/to/first.test.mjs tests/path/to/second.test.mjs`.
Run the full `npm test` suite for final validation before a commit, milestone, or release.

## CLI

Keep `--help` and `--version` read-only.
Document each command, argument, default, error, and exit code.

## Web

Keep route, asset, build, and deployment guidance aligned with maintained code and workflows.

## npm publication

Use `.github/workflows/npm.yaml` for package publication.
Follow the approved release process before publication.
