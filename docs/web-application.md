# Web application guide

This guide explains how to configure and operate the Core dashboard and webhook listener.

## Contents

- [Get started](#get-started)
- [Configuration](#configuration)
- [Routes and API example](#routes-and-api-example)
- [Browser app and offline behavior](#browser-app-and-offline-behavior)
- [Deployment behavior](#deployment-behavior)
- [Health monitoring and notifications](#health-monitoring-and-notifications)
- [Browser validation](#browser-validation)
- [npm publication](#npm-publication)
- [Extend the web app](#extend-the-web-app)
- [Validate changes](#validate-changes)
- [Troubleshooting](#troubleshooting)

## Get started

Install Node.js 26 or later and use npm to install package dependencies.

Run these commands from the package repository during development:

```sh
npm ci
npm run build
node bin/core-web.mjs
```

Set the working directory to the router configuration repository before starting the application.
The application reads `.env` from its working directory.
Open `http://localhost:9300/` to view the dashboard.

## Configuration

The server reads values from its process environment and the `.env` file in its working directory.
Copy `.env.example` to `.env`, then set values for each router.

| Name                    | Required  | Default                         | Accepted values                                                  |
| ----------------------- | --------- | ------------------------------- | ---------------------------------------------------------------- |
| `PORT`                  | No        | `9300`                          | Dashboard port from `1` through `65535`.                         |
| `WEBHOOK_PORT`          | No        | `9301`                          | Webhook port from `1` through `65535`, separate from `PORT`.     |
| `LOG_LEVEL`             | No        | `info`                          | `error`, `warn`, `info`, `http`, `verbose`, `debug`, or `silly`. |
| `CORE_REPO_PATH`        | For hooks | —                               | Router configuration repository path.                            |
| `GITHUB_WEBHOOK_SECRET` | For hooks | —                               | Secret used to authenticate GitHub webhook signatures.           |
| `DISCORD_WEBHOOK_URL`   | No        | —                               | Discord webhook URL for rich embed notifications.                |
| `CORE_GITHUB_BRANCH`    | No        | `main`                          | Branch deployed from the configuration repository.               |
| `CORE_HEALTH_UNITS`     | No        | Empty list                      | Comma-separated systemd unit names to monitor.                   |
| `SNOWFLAKE_WORKER_ID`   | No        | `0`                             | Snowflake worker value from `0` through `31`.                    |
| `SNOWFLAKE_PROCESS_ID`  | No        | `process.pid % 32` when omitted | Optional process value from `0` through `31`.                    |

The server rejects invalid ports and rejects equal dashboard and webhook ports.
The dashboard and webhook TCP endpoint numbers must not be the same.
The dashboard and webhook listener use loopback.
Configure a proxy to expose the dashboard and route GitHub webhook traffic to `WEBHOOK_PORT`.
The `LOG_LEVEL` value sets the minimum level for application log messages.

The screenshot and PWA audit commands also read these process environment values:

| Name              | Default                  | Purpose                                  |
| ----------------- | ------------------------ | ---------------------------------------- |
| `WEB_URL`         | `http://127.0.0.1:9300/` | Server URL used by browser checks.       |
| `SCREENSHOT_PATH` | `artifacts/home.png`     | Output path used by the screenshot tool. |

These values do not configure the web server.

Set `PORT` to `9300` for the read-only dashboard. Set `WEBHOOK_PORT` to a distinct port for each server.
The application rejects equal dashboard and webhook ports.

Set both `CORE_REPO_PATH` and `GITHUB_WEBHOOK_SECRET` to enable deployment hooks.
Configure the GitHub webhook to send JSON push events to `http://<router>:<WEBHOOK_PORT>/api/github/webhook`.
Set the GitHub secret to the same value as `GITHUB_WEBHOOK_SECRET`.
The listener checks the `x-hub-signature-256` signature against the raw request body.
It deploys pushes to `CORE_GITHUB_BRANCH`, which defaults to `main`.
It ignores other event types and branches and rejects a repeated GitHub request ID.

## Deployment behavior

The webhook accepts a valid push asynchronously and returns HTTP 202 while deployment runs.
It returns HTTP 409 when deployment is in progress.
It returns HTTP 401 for an invalid signature and HTTP 503 when deployment settings are missing.
It requires a clean repository before it starts a deployment.
It checks that the repository remains clean after Git pull and each npm validation command.
If a check finds changes, the sequence stops and recovery restores the previous commit.

The server rejects JSON request bodies larger than 1 MiB.
It remembers accepted GitHub request IDs until the application restarts.

The application records the local commit before `git pull` as its recovery target.
It runs `git pull --ff-only -- origin <branch>`, `npm ci --include=dev`, `npm test`, `npm run preflight`, and `npm run reload` in order.
It stops the sequence at the first failed command.
If a command fails before reload, the application resets the repository to the previous commit without reloading router processes.
If the new reload fails, the application resets the repository and attempts to reload the previous configuration.
If Git cannot restore the previous commit, the application records that failure and does not reload the current configuration.

The application preserves untracked files during recovery.
Set the systemd unit umask to `0022` so router processes can read files that Git pulls.
The dashboard shows the latest deployment result until the process restarts.
The application creates decimal deployment IDs with `@eliware/common` snowflakes.
Set a unique worker and process pair for every active instance.

## Health monitoring and notifications

Set `CORE_HEALTH_UNITS` to a comma-separated list of systemd unit names such as `named.service,kea-dhcp4.service`.
The application checks each unit at startup and every five minutes.
An empty list reports the monitored units as unconfigured.

The dashboard refreshes every 30 seconds.
Set `DISCORD_WEBHOOK_URL` to send deployment and health notifications as Discord rich embeds.
The application sends a health notification on each failed check interval.
`/health` reports process liveness and `/ready` reports listener readiness.
`/api/status` reports monitored unit health and the latest deployment result.

Keep `.env` out of Git. The example file contains placeholders only.

The package version, repository URLs, and release tags are metadata or deployment settings.
They do not change the runtime server configuration.

## Routes and API example

The server serves the app page, built browser files, public assets, API example, and status routes.

| Method | Path                               | Result                                     |
| ------ | ---------------------------------- | ------------------------------------------ |
| `GET`  | `/`                                | Serves `public/index.html`.                |
| `GET`  | `/client.js`                       | Serves `dist/client.js`.                   |
| `GET`  | `/styles.css`                      | Serves `public/styles.css`.                |
| `GET`  | `/service-worker.js`               | Serves `dist/service-worker.js`.           |
| `GET`  | `/manifest.webmanifest`            | Serves app install metadata.               |
| `GET`  | `/icons/template.svg`              | Serves the general app icon.               |
| `GET`  | `/icons/template-maskable.svg`     | Serves the scalable maskable icon.         |
| `GET`  | `/icons/template-192.png`          | Serves the 192 by 192 pixel icon.          |
| `GET`  | `/icons/template-512.png`          | Serves the 512 by 512 pixel icon.          |
| `GET`  | `/icons/template-maskable-512.png` | Serves the 512 by 512 pixel maskable icon. |
| `GET`  | `/screenshots/core-desktop.png`    | Serves the desktop preview.                |
| `GET`  | `/screenshots/core-mobile.png`     | Serves the mobile preview.                 |
| `GET`  | `/health`                          | Returns `{"status":"ok"}`.                 |
| `GET`  | `/ready`                           | Returns `{"status":"ready"}`.              |
| `GET`  | `/api/status`                      | Returns health and deployment status.      |
| `POST` | `/api/examples/:exampleId`         | Validates and returns an API example.      |

Unsupported methods on page and asset routes return HTTP 405.
Unknown paths return HTTP 404.

The webhook listener accepts `POST /api/github/webhook` on `WEBHOOK_PORT`.
The dashboard cannot edit configuration or launch deployments.
The dashboard has no user authentication. Limit access with the router network and firewall.

The API example accepts a lowercase letter, digit, or hyphen in `exampleId`.
The ID must contain between 1 and 40 characters.
The JSON body requires `name` with 1 to 80 characters.

The optional `description` field accepts a maximum of 280 characters.
The optional `source` query value accepts 1 to 40 characters.
The route rejects unlisted fields and returns HTTP 400 for invalid input.
The route does not save data.

Send a valid request with curl:

```sh
curl -X POST 'http://localhost:9300/api/examples/example-123?source=template' \
  -H 'content-type: application/json' \
  -d '{"name":"Example item","description":"A sample API contract."}'
```

The server returns this JSON response:

```json
{
  "id": "example-123",
  "name": "Example item",
  "description": "A sample API contract.",
  "source": "template"
}
```

## Browser app and offline behavior

The manifest describes the app name, start path, window mode, colors, icons, and preview images.
The browser worker saves the app shell after a visit that loads the app.
It also saves valid preview image responses.
The worker does not cache API, health, or readiness routes.
The worker removes only obsolete caches that use its `core-shell-` prefix.

The app shell contains `/`, `/client.js`, `/styles.css`, `/manifest.webmanifest`, and `/icons/template.svg`.
The other manifest icons and preview images load from `public/` when requested.
API calls require a network connection because the worker does not save API responses.

To check offline behavior, open the app in a supported browser and wait until the worker controls the page.
Reload the page after the worker becomes active.
Set the browser network mode to offline, then reload the page again.
The saved app shell loads. API calls fail without a network connection.

## Browser validation

Install Chrome for Puppeteer once:

```sh
npm run puppeteer
```

Start the server in one terminal. Run the screenshot or audit commands in a different terminal.

```sh
npm run screenshots
npm run lighthouse
```

The screenshot command saves one page image under the ignored `artifacts/` directory.
Set `WEB_URL` to change the server address.
Set `SCREENSHOT_PATH` to select a screenshot output file.

The Lighthouse command writes its report to `artifacts/lighthouse.json`.
It checks performance, best practices, SEO, and accessibility.
Puppeteer then checks the manifest, install icons, preview images, worker control, and offline page load.

The PWA audit passes when each browser and offline check passes. Lighthouse writes its own report.
These browser checks run outside `npm test` and CI.
Stop the server after browser validation.

## npm publication

The package includes the CLI and web application. The npm workflow validates tagged releases and publishes the package with provenance.
The release tag must match the package version. Follow the approved release process before publication.

## Extend the web app

Update `package.json` with the derived app name, description, keywords, and repository URLs.
Update `public/manifest.webmanifest` with the app name, description, colors, and start path.
Replace the icon and preview image files under `public/` with artwork from the derived app.
Keep each public asset path aligned with `src/backend/route-resolver.mjs`.

Add routes in `src/backend/` and browser code in `src/frontend/`.
Add route tests under the matching path in `tests/`.
Update the route table and examples in this guide after route behavior changes.
Read [AGENTS.md](../AGENTS.md) and [the specifications index](../specs/README.md) before changing repository rules.
Read [release notes](../RELEASE_NOTES.md) for changes in each version.

## Validate changes

Run the aggregate checks before you commit:

```sh
npm test
```

`npm test` runs the aggregate command for tests, lint, formatting, dependency checks, and package rules.
Run `npm run build` separately to build browser assets.
Run focused tests by passing one or more test file paths:

```sh
npm test -- tests/backend/config.test.mjs
npm test -- tests/backend/config.test.mjs tests/frontend/service/worker.test.mjs
```

Run `npm run lint`, `npm run audit`, and `npm run format:check` to run individual checks.
Run `npm run format` to apply the repository formatter.
Run `npm run pack` to check the files included in the package.
The build runs `npm run prebuild` first to check the webpack command.

## Troubleshooting

If the server rejects a port, set an integer from `1` through `65535` and use different values for both listeners.
If the server cannot open its port, stop the process that uses it or set a different port.
If `/client.js` returns HTTP 404, run `npm run build` and confirm that `dist/client.js` exists.

If an API request returns HTTP 400, check its path, query, and JSON body against the schema above.
If offline loading fails, reload after the worker controls the page and cache the app shell.
If browser checks cannot start Chrome, run `npm run puppeteer` before the checks.
