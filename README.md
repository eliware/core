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

`core-cli` validates and compares router configuration repositories.
`core-web` provides a read-only dashboard, health monitoring, metrics, and GitHub deployment hooks.

## Requirements

Use Node.js 26 or later.
Install Bash when the router repository contains shell scripts.

## Setup

Install Core as a development dependency in each router configuration repository:

```sh
npm install --save-dev @eliware/core@latest
```

Follow the [router installation guide](docs/router-installation.md) to prepare a router host.

## Usage

Run `core-cli preflight` to validate one router repository.
Run `core-cli compare <partner-repo>` to validate a router pair.
Read the [CLI guide](docs/cli-application.md) and [web application guide](docs/web-application.md) for details.
Read [release notes](RELEASE_NOTES.md) for version history.

## Development

Run `npm ci` from this repository root.
Read [AGENTS.md](AGENTS.md), the [documentation index](docs/README.md), and the [specifications index](specs/README.md) before you change files.

## Testing

Run `npm test` for aggregate checks with the browser build.
Run `npm run build` to build browser bundles directly.
Run the browser checks separately with `npm run screenshots` or `npm run lighthouse`.

## Troubleshooting

Read the [CLI guide](docs/cli-application.md) for validation errors.
Read the [installation guide](docs/router-installation.md) for host setup problems.
Read the [web application guide](docs/web-application.md) for server and webhook problems.

## Security

Keep credentials, private data, and runtime state out of Git.
Limit dashboard and webhook access with the router firewall or an approved proxy.

## Configuration

The web application reads environment values and `.env` from its working directory.
Read the [configuration guide](docs/web-application.md#configuration) for variable defaults and requirements.

## Operations

Use the [router installation guide](docs/router-installation.md) to install services and configuration links.
Read the [web application guide](docs/web-application.md) for dashboard and deployment operations.

## Commands

| Command                                       | Purpose                                      |
| --------------------------------------------- | -------------------------------------------- |
| `core-cli preflight`                          | Validate one router repository.              |
| `core-cli compare <partner-repo>`             | Validate a router pair.                      |
| `core-cli catalog`                            | List catalog components.                     |
| `core-cli status [component] [--repo <path>]` | Check component health units.                |
| `core-cli reload [component] [--repo <path>]` | Run component reload actions.                |
| `core-web`                                    | Start the dashboard and webhook application. |

Run `core-cli --help` or `core-web --help` for command help.
Run `core-cli --version` or `core-web --version` for the package version.
Read the [CLI guide](docs/cli-application.md) for arguments, defaults, and command results.

## Exit codes

The CLI commands return these codes:

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | The command completed successfully.                           |
| `1`  | Repository validation or an operation failed.                 |
| `2`  | The command received invalid syntax or an unsupported option. |

## Routes

The dashboard serves `/`, `/health`, `/ready`, and `/api/status`.
The webhook listener accepts `POST /api/github/webhook` on its configured port.
Read the [route guide](docs/web-application.md#routes) for assets and response details.

## Assets

Keep browser source files in `src/frontend/` and served assets in `public/`.
The build creates `dist/client.js` and `dist/service-worker.js` as local build artifacts.
The npm package excludes `dist/` and ships browser bundles from `public/`.
The `prepack` script rebuilds those bundles before `npm pack` or `npm publish`.
Run `node bin/copy-web-assets.mjs` after a manual build to refresh local assets.

## Development server

Run `core-web` from a router repository.
The dashboard defaults to loopback port `9300`, and the webhook defaults to loopback port `9301`.
Read the [web application guide](docs/web-application.md#configuration) for proxy settings.

## Build

Run `npm run build` to create browser bundles in `dist/`.
Run `node bin/copy-web-assets.mjs` to update the packaged browser assets.
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
