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

Core Networking Manager combines a Node.js command-line interface with a Fastify web application.
The CLI prints help or the package version. The web app serves browser assets, an API example, health checks, and readiness checks.

## Requirements

Use Node.js 26 or later and npm 12 or later.

## Setup

Run `npm ci` from the repository root.

## Usage

Run `core-cli --help` for CLI help. Run `core-cli --version` for the package version.
Run `npm run build`, then run `core-web` to start the web app on port `9300`.
Read [release notes](RELEASE_NOTES.md) for version history.

## Development

Read [AGENTS.md](AGENTS.md), the [documentation index](docs/README.md), and the [specifications index](specs/README.md) before changing files.
Read the [CLI guide](docs/cli-application.md) and [web application guide](docs/web-application.md).

## Testing

Run `npm test` for aggregate validation. Pass test file paths to run focused tests.
Run `npm run build` to build browser assets.

## Troubleshooting

If the server rejects `PORT`, set an integer from `1` through `65535`.
If `/client.js` returns HTTP 404, run `npm run build` and confirm that `dist/client.js` exists.
If the CLI returns exit code 2, remove unsupported arguments.

## Security

Keep credentials, private data, and runtime state out of Git.
Store secret values in an approved secret store.

## Configuration

Set `PORT` to set the web server port. It defaults to `9300` and accepts integers from `1` through `65535`.
Set `LOG_LEVEL` to set the Fastify log level. It defaults to `info`.

## Operations

Run `core-cli --help` or `core-cli --version` for CLI information.
Run `npm run build`, then run `core-web` to start the web server.
Follow the approved release process to publish the npm package.

## Commands

Run `core-cli --help` to print usage. Run `core-cli --version` to print the package version.
Run the command with no arguments to print help.
The CLI accepts no other arguments and does not change state.

## Exit codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| `0`  | Help, version, or usage completed.            |
| `2`  | The command received an unsupported argument. |

## Routes

| Method | Path                       | Result                            |
| ------ | -------------------------- | --------------------------------- |
| `GET`  | `/`                        | Serves the app page.              |
| `GET`  | `/client.js`               | Serves the browser bundle.        |
| `GET`  | `/styles.css`              | Serves the page styles.           |
| `GET`  | `/manifest.webmanifest`    | Serves app install metadata.      |
| `GET`  | `/service-worker.js`       | Serves the offline worker.        |
| `GET`  | `/icons/*`                 | Serves app icons.                 |
| `GET`  | `/screenshots/*`           | Serves preview images.            |
| `GET`  | `/health`                  | Returns `{"status":"ok"}`.        |
| `GET`  | `/ready`                   | Returns `{"status":"ready"}`.     |
| `POST` | `/api/examples/:exampleId` | Validates an API example request. |

Unsupported methods on page and asset routes return HTTP 405. Unknown paths return HTTP 404.

## Assets

Keep source assets in `public/`. The build creates `dist/client.js` and `dist/service-worker.js`.
The app page, manifest, icons, styles, and preview images come from `public/`.

## Development server

Run `npm run build`, then run `core-web`. The server listens on port `9300` by default.
Run `npm run puppeteer` to install Chrome before browser checks.

## Build

Run `npm run build` to bundle the browser client and worker into `dist/`.
Run `npm test` to validate the repository.

## Deployment

Use the npm publication workflow for approved package releases.
Publication does not deploy or start the web app.

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
