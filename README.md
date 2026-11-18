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

Core Networking Manager provides `core-cli` and `core-web` for managed router configurations.
The web application provides a read-only dashboard and an optional GitHub deployment listener.
The listener accepts signed pushes when its repository path and webhook secret are configured.

## Requirements

Use Node.js 26 or later and npm 12 or later.

## Setup

Run `npm ci` from this repository root.
After an approved package release, install `@eliware/core` as a development dependency in each router configuration repository.

```sh
npm install --save-dev @eliware/core
```

## Usage

Run `core-cli preflight` from a router configuration repository to validate its files.
Run `core-cli compare <partner-repo>` to validate a high availability pair.
Read the [CLI guide](docs/cli-application.md) and [web application guide](docs/web-application.md) for command and deployment details.
Read [release notes](RELEASE_NOTES.md) for version history.

## Development

Read [AGENTS.md](AGENTS.md), the [documentation index](docs/README.md), and the [specifications index](specs/README.md) before changing files.

## Testing

Run `npm test` for aggregate validation. It runs tests, lint, formatting, dependency, and package checks.
Run `npm run build` to build the browser assets. This command first runs `npm run prebuild`, which checks the webpack command version.

Run `npm run screenshots` or `npm run lighthouse` after starting the server to check browser behavior. Lighthouse also checks web app install and offline requirements.
Run `npm run puppeteer` once to install Chrome for browser checks.

Run `npm run pack` to check package contents and packaging rules.
Run `npm run format` to apply formatting to maintained files. Then run `npm run format:check` and `npm test` to verify the changes.
Run `npm run audit` to check dependencies for known vulnerabilities. Run `npm test` after changing dependency metadata.
Run `npm run lint` to run lint checks without the full aggregate validation.

## Troubleshooting

If the application rejects a port, set a different integer from `1` through `65535` for each listener.
If a new checkout returns HTTP 404 for `/client.js`, run `npm run build` and confirm that `dist/client.js` exists.
If the webhook returns HTTP 503, check every required value in `.env` and examine the startup log for errors.
If health status says `unconfigured`, set `CORE_HEALTH_UNITS` to one or more systemd unit names.
Read the [CLI guide](docs/cli-application.md) for CLI exit codes and validation failures.

## Security

Keep credentials, private data, and runtime state out of Git.
Keep `.env` files outside Git and limit dashboard access because the dashboard has no user authentication.

## Configuration

| Name                    | Required | Default                  | Purpose                                                                                                       |
| ----------------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | No       | `9300`                   | Dashboard port.                                                                                               |
| `WEBHOOK_PORT`          | No       | `9301`                   | Separate webhook TCP endpoint. Set a distinct value for each server.                                          |
| `CORE_REPO_PATH`        | No       | None                     | Local configuration repository path. Required to enable deployments.                                          |
| `GITHUB_WEBHOOK_SECRET` | No       | None                     | Secret for signed GitHub pushes. Required to enable deployments.                                              |
| `CORE_GITHUB_BRANCH`    | No       | `main`                   | Branch name with slash-separated segments that start with a letter, number, or underscore, and excludes `..`. |
| `DISCORD_WEBHOOK_URL`   | No       | None                     | HTTPS Discord webhook URL for rich embed notifications.                                                       |
| `CORE_HEALTH_UNITS`     | No       | Empty list               | Comma-separated systemd unit names ending in `.service`.                                                      |
| `LOG_LEVEL`             | No       | `info`                   | Log level passed to the application logger.                                                                   |
| `WEB_URL`               | No       | `http://127.0.0.1:9300/` | Server URL used by the screenshot command.                                                                    |
| `SCREENSHOT_PATH`       | No       | `artifacts/home.png`     | Output file used by the screenshot command.                                                                   |

The dashboard and webhook TCP endpoint numbers must not be the same. The application reads values from its process environment and `.env` in its working directory.
The screenshot command reads `WEB_URL` and `SCREENSHOT_PATH`. The web server does not read these settings.

## Operations

Set `WEBHOOK_PORT` to a distinct value on each server.
Run `npm run build`, then start `core-web` from each router configuration repository.
Push each router repository separately to control deployment timing.

## Commands

Run `core-cli --help` to print command usage. Run `core-cli --version` to print the package version.
Run `core-cli preflight` from a router configuration repository to validate its files.
Run `core-cli compare <partner repo>` to compare two router configuration repositories.
Run `core-cli` with no arguments to print help. Read the [CLI guide](docs/cli-application.md) for argument rules and validation details.

## Exit codes

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| `0`  | The command completed successfully.                         |
| `1`  | A repository or pair validation failed.                     |
| `2`  | The command received invalid syntax or unsupported options. |

## Routes

| Method | Path                       | Result                                          |
| ------ | -------------------------- | ----------------------------------------------- |
| `GET`  | `/`                        | Serves the app page.                            |
| `GET`  | `/client.js`               | Serves the browser bundle.                      |
| `GET`  | `/styles.css`              | Serves the page styles.                         |
| `GET`  | `/manifest.webmanifest`    | Serves app install metadata.                    |
| `GET`  | `/service-worker.js`       | Serves the offline worker.                      |
| `GET`  | `/icons/*`                 | Serves app icons.                               |
| `GET`  | `/screenshots/*`           | Serves preview images.                          |
| `GET`  | `/health`                  | Returns `{"status":"ok"}`.                      |
| `GET`  | `/ready`                   | Returns `{"status":"ready"}`.                   |
| `GET`  | `/api/status`              | Returns read-only health and deployment status. |
| `POST` | `/api/examples/:exampleId` | Validates an API example request.               |

Unsupported methods on page and asset routes return HTTP 405. Unknown paths return HTTP 404.
The separate webhook listener accepts `POST /api/github/webhook` on `WEBHOOK_PORT`.
The server limits JSON request bodies to 1 MiB.

## Assets

Keep source assets in `public/`. The build creates `dist/client.js` and `dist/service-worker.js`.
The app page, manifest, icons, styles, and preview images come from `public/`.

## Development server

Run `npm run build`, then run `core-web` from the configuration repository working directory.
The dashboard listens on port `9300` and the webhook listener listens on port `9301` by default.
Run `npm run puppeteer` to install Chrome before browser checks.

## Build

Run `npm run build` to create `dist/client.js` and `dist/service-worker.js`.
Run `npm test` for aggregate validation. Run `npm run build` separately to build browser assets.

## Deployment

The webhook validates a signed push to `CORE_GITHUB_BRANCH` before deployment.
It runs `git pull --ff-only --`, `npm ci`, `npm test`, `npm run preflight`, and `npm run reload` in order.
If a step fails before reload, the application restores tracked files to the previous commit without reloading applications.
If reload fails, the application restores the previous commit and attempts to reload its configuration.
If Git cannot restore the previous commit, the application records the recovery failure and does not reload the current configuration.

Read the [web application guide](docs/web-application.md) for the full deployment and recovery process.
Follow the approved npm publication process to publish package releases.

The process stores accepted GitHub request IDs in memory and rejects repeat requests.

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
