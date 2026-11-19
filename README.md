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

Core provides `core-cli` for router configuration validation and `core-web` for status and deployment hooks.

## Requirements

Use Node.js 26 or later. Install Bash when router repositories contain shell scripts.

## Setup

Run `npm ci` from this repository root. Install `@eliware/core` as a development dependency in each router repository.

```sh
npm install --save-dev @eliware/core@latest
```

## Usage

Run `core-cli preflight` for one repository and `core-cli compare <partner-repo>` for a pair.
Read the [CLI guide](docs/cli-application.md) and [web application guide](docs/web-application.md) for workflows.
Read [release notes](RELEASE_NOTES.md) for version history.

## Development

Read [AGENTS.md](AGENTS.md) for contributor instructions.
Use the [documentation index](docs/README.md) and [specifications index](specs/README.md) to find maintained guidance.

## Testing

Run `npm test` for aggregate repository validation.
Browser builds and browser checks run separately from `npm test`.

## Troubleshooting

Read the [CLI guide](docs/cli-application.md) for validation errors.
Read the [web application guide](docs/web-application.md) for server and webhook issues.

## Security

Keep credentials, private data, and runtime state out of Git.
Allow proxy and firewall access from approved clients because the application has no authentication.

## Configuration

The web application reads environment values and `.env` from its working directory.
Read the [configuration guide](docs/web-application.md#configuration) for defaults and requirements.

## Operations

Configure the dashboard and webhook listener using the [web application guide](docs/web-application.md).
Push router repositories separately when deployments require different timing.

## Commands

Run `core-cli --help` or `core-web --help` for command help.
Run `core-cli --version` or `core-web --version` for the package version.
Run `core-web` from a router repository to start the web application.

## Exit codes

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | The command completed successfully.                           |
| `1`  | Repository or pair validation failed.                         |
| `2`  | The command received invalid syntax or an unsupported option. |

## Routes

The dashboard serves its page, assets, health, readiness, and status routes.
The webhook listener accepts `POST /api/github/webhook` on its configured port.
Read the [route guide](docs/web-application.md#routes) for paths and results.

## Assets

Keep browser source assets in `public/`. The build creates `dist/client.js` and `dist/service-worker.js`.

## Development server

Run `core-web` from a router repository. The dashboard defaults to port `9300`, and the webhook listener defaults to port `9301`.

## Build

Run `npm run build` to create browser bundles in `dist/`.
Read the [browser validation guide](docs/web-application.md#browser-validation) for screenshot and audit commands.

## Deployment

The webhook checks signed pushes and runs deployment steps in order.
Read the [deployment guide](docs/web-application.md#deployment-behavior) for validation and recovery details.
Use `.github/workflows/npm.yaml` and the approved release process to publish the package.

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
