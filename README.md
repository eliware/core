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

The `core-cli` tool validates and compares router configuration repositories.
The `core-web` application provides router health, metrics, and GitHub deployment hooks.

## Requirements

Use Node.js 26 or later.
Install Bash when the router repository contains shell scripts.

## Setup

Follow the [router installation guide](docs/router-installation.md) to prepare a CentOS 10 router.
Install the package in a router repository with `npm install --save-dev @eliware/core@latest`.

## Usage

Run `core-cli preflight` to validate one router repository.
Run `core-cli compare <partner-repo>` to validate a router pair.
Read the [CLI guide](docs/cli-application.md) and [web application guide](docs/web-application.md) for details.
Read [release notes](RELEASE_NOTES.md) for version history.

## Development

Run `npm ci` from this repository root.
Read [AGENTS.md](AGENTS.md), the [documentation index](docs/README.md), and the [specifications index](specs/README.md) for maintained guidance.

## Testing

Run `npm test` for aggregate repository validation.
Run `npm run build` after changing browser source files.

## Troubleshooting

Read the [CLI guide](docs/cli-application.md) for validation errors.
Read the [installation guide](docs/router-installation.md) for router setup problems.
Read the [web application guide](docs/web-application.md) for server and webhook problems.

## Security

Keep credentials, private data, and runtime state out of Git.
Limit dashboard and webhook access through the router firewall or an approved proxy.

## Configuration

The web application reads environment values and `.env` from its working directory.
Read the [configuration guide](docs/web-application.md#configuration) for defaults and requirements.

## Operations

Use the [router installation guide](docs/router-installation.md) to install services and configuration links.
Read the [web application guide](docs/web-application.md) to configure dashboard and webhook operations.

## Commands

| Command                                       | Purpose                                      |
| --------------------------------------------- | -------------------------------------------- |
| `core-cli preflight`                          | Validate one router repository.              |
| `core-cli compare <partner-repo>`             | Validate a router pair.                      |
| `core-cli catalog`                            | List catalog components.                     |
| `core-cli status [component] [--repo <path>]` | Check component health units.                |
| `core-cli reload [component] [--repo <path>]` | Run component reload actions.                |
| `core-web`                                    | Start the dashboard and webhook application. |

Run `core-cli --help` or `core-web --help` for help.
Run `core-cli --version` or `core-web --version` for the package version.

## Exit codes

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | The command completed successfully.                           |
| `1`  | Repository validation or an operation failed.                 |
| `2`  | The command received invalid syntax or an unsupported option. |

## Routes

The dashboard listener serves the application, assets, health, readiness, and status routes.
The webhook listener accepts `POST /api/github/webhook` on its configured port.
Read the [route guide](docs/web-application.md#routes) for paths and results.

## Assets

Keep browser source assets in `public/`.
The build creates `dist/client.js` and `dist/service-worker.js`.

## Development server

Run `core-web` from a router repository.
The dashboard defaults to port `9300`, and the webhook listener defaults to port `9301`.

## Build

Run `npm run build` to create browser bundles in `dist/`.
Read the [browser validation guide](docs/web-application.md#browser-validation) for browser checks.

## Deployment

The webhook validates signed GitHub push events and runs configured deployment steps in order.
Read the [deployment guide](docs/web-application.md#deployment-behavior) for validation and recovery details.

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
