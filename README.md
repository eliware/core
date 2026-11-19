# [![eliware.org](https://eliware.org/logos/brand.png)](https://discord.gg/M6aTR9eTwN)

## @eliware/core [![npm](https://img.shields.io/npm/v/@eliware/core)](https://www.npmjs.com/package/@eliware/core) [![License](https://img.shields.io/github/license/eliware/core)](https://github.com/eliware/core/blob/main/LICENSE) [![CI](https://github.com/eliware/core/actions/workflows/ci.yaml/badge.svg)](https://github.com/eliware/core/actions/workflows/ci.yaml)

Core Networking Manager.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup](#setup)
- [Usage](#usage)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Configuration](#configuration)
- [Operations](#operations)
- [Commands](#commands)
- [Exit codes](#exit-codes)
- [Routes](#routes)
- [Assets](#assets)
- [Development server](#development-server)
- [Build](#build)
- [Deployment](#deployment)
- [Support](#support)
- [Links](#links)
- [License](#license)

## Features

Core provides `core-cli` for configuration validation and `core-web` for status and deployment hooks.
The [CLI guide](docs/cli-application.md) and [web application guide](docs/web-application.md) describe user workflows.

## Requirements

Use Node.js 26 or later.
Install Bash when configuration repositories contain shell scripts.

## Setup

Run `npm ci` from this repository root.
Install `@eliware/core` as a development dependency in each configuration repository after an approved package release.

```sh
npm install --save-dev @eliware/core
```

## Usage

Run `core-cli preflight` to validate the current configuration repository.
Run `core-cli compare <partner-repo>` to validate a pair of repositories.
Read the [CLI guide](docs/cli-application.md) and [web application guide](docs/web-application.md) for complete usage.
Read [release notes](RELEASE_NOTES.md) for version history.

## Development

Read [AGENTS.md](AGENTS.md) for contributor instructions.
Use the [documentation index](docs/README.md) and [specifications index](specs/README.md) to find maintained guidance.

## Testing

Run `npm test` for the aggregate repository validation checks.
The browser build and browser audit commands run as separate scripts.
Run `npm run lint` to check code style and `npm run audit` to check dependencies.
Run `npm run format` to format files and `npm run format:check` to check formatting.
Run `npm run pack` to validate package contents.

Run `npm run build` to build browser assets.
Run `npm run puppeteer` to install Chrome for browser checks.
Run `npm run screenshots` or `npm run lighthouse` while the web application runs.
Read the [web application guide](docs/web-application.md#browser-validation) for browser check details.

## Troubleshooting

Read the [CLI guide](docs/cli-application.md) for configuration validation errors.
Read the [web application guide](docs/web-application.md) for server, webhook, and browser issues.

## Security

Keep credentials, private data, and runtime state out of Git.
Allow proxy and firewall access from approved clients only because the application has no authentication.

## Configuration

The web application reads environment values and `.env` from its working directory.
Read the [web application guide](docs/web-application.md#configuration) for each value, default, and requirement.

## Operations

Configure the web application and webhook listener with the values in the [web application guide](docs/web-application.md).
Push configuration repositories separately when deployments require different timing.

## Commands

Run `core-cli --help` or `core-web --help` to print command help.
Run `core-cli --version` or `core-web --version` to print the package version.
Run `core-cli preflight` or `core-cli compare <partner-repo>` for repository validation.
Run `core-web` to start the web application from its configured working directory.
Read the [CLI guide](docs/cli-application.md) for command arguments and validation behavior.

## Exit codes

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | The command completed successfully.                           |
| `1`  | Repository or pair validation failed.                         |
| `2`  | The command received invalid syntax or an unsupported option. |

## Routes

The dashboard serves page, asset, health, readiness, status, and API example routes.
The separate webhook listener accepts `POST /api/github/webhook`.
Read the [web application guide](docs/web-application.md#routes-and-api-example) for route details and responses.

## Assets

Keep browser source assets in `public/`.
The build creates `dist/client.js` and `dist/service-worker.js`.

## Development server

Run `npm run build`, then run `core-web` from the configuration repository working directory.
The dashboard defaults to port `9300`, and the webhook listener defaults to port `9301`.

## Build

Run `npm run build` to create browser bundles in `dist/`.
Read the [web application guide](docs/web-application.md#browser-validation) for browser validation commands.

## Deployment

The webhook validates signed pushes and runs the configured deployment steps in order.
Read the [web application guide](docs/web-application.md#deployment-behavior) for deployment and recovery details.
Use `.github/workflows/npm.yaml` and the approved release process for package publication.

## Support

For help, questions, or to chat with the author and community, visit:

[![Discord](https://eliware.org/logos/discord_96.png)](https://discord.gg/M6aTR9eTwN)[![eliware.org](https://eliware.org/logos/eliware_96.png)](https://discord.gg/M6aTR9eTwN)

**[eliware.org on Discord](https://discord.gg/M6aTR9eTwN)**

## Links

- [Home Page](https://eliware.org)
- [GitHub Org](https://github.com/eliware)
- [GitHub Repo](https://github.com/eliware/core)
- [Bug Reports](https://github.com/eliware/core/issues)
- [npm](https://www.npmjs.com/package/@eliware/core)
- [Discord](https://discord.gg/M6aTR9eTwN)

## License

[MIT © Eliware](LICENSE)
