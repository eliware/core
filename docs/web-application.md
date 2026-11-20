# Web application guide

This guide explains how to configure and operate the Core dashboard and webhook listener.

## Contents

- [Get started](#get-started)
- [Configuration](#configuration)
- [Routes](#routes)
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

| Name                    | Required | Default      | Accepted values                                                                  |
| ----------------------- | -------- | ------------ | -------------------------------------------------------------------------------- |
| `PORT`                  | No       | `9300`       | Dashboard port from `1` through `65535`.                                         |
| `CORE_DASHBOARD_URL`    | No       | Loopback URL | Public dashboard URL used in systemd event notifications.                        |
| `WEBHOOK_PORT`          | No       | `9301`       | Webhook port from `1` through `65535`, separate from `PORT`.                     |
| `LOG_LEVEL`             | No       | `info`       | `error`, `warn`, `info`, `http`, `verbose`, `debug`, or `silly`.                 |
| `CORE_REPO_PATH`        | No       | None         | Repository path. Set this value to enable deployment hooks.                      |
| `GITHUB_WEBHOOK_SECRET` | No       | None         | Secret used to authenticate GitHub webhook signatures.                           |
| `DISCORD_WEBHOOK_URL`   | No       | —            | Discord webhook URL for rich embed notifications.                                |
| `CORE_GITHUB_BRANCH`    | No       | `main`       | Branch deployed from the configuration repository.                               |
| `CORE_HEALTH_UNITS`     | No       | Empty list   | More systemd units to monitor with or without a catalog.                         |
| `SNOWFLAKE_WORKER_ID`   | Yes      | None         | Unique worker value from `0` through `31` for this active application instance.  |
| `SNOWFLAKE_PROCESS_ID`  | Yes      | None         | Unique process value from `0` through `31` for this active application instance. |

The server rejects invalid ports and rejects equal dashboard and webhook ports.
The dashboard and webhook TCP endpoint numbers must not be the same.
The dashboard and webhook listener use loopback.

Set `CORE_DASHBOARD_URL` to the dashboard address that Discord recipients can open.
Set a public hostname or public IP address in this value.
The application rejects loopback, private, and link-local addresses.
It also rejects `localhost` and hostnames that end with `.local`, `.internal`, or `.lan`.
The event notification links to the loopback dashboard URL when this value is unset.

Configure a proxy or network port forward to route external requests to the configured loopback ports.
The `LOG_LEVEL` value sets the minimum level for application log messages.

The screenshot and PWA audit commands also read these process environment values:

| Name              | Default                  | Purpose                                     |
| ----------------- | ------------------------ | ------------------------------------------- |
| `WEB_URL`         | `http://127.0.0.1:9300/` | Server URL used by browser checks.          |
| `SCREENSHOT_PATH` | `artifacts/home.png`     | Output file used by the screenshot command. |

These values do not configure the web server.

Set `PORT` to `9300` for the read-only dashboard. Set `WEBHOOK_PORT` to a distinct port for each server.
The application rejects equal dashboard and webhook ports.

Set both `CORE_REPO_PATH` and `GITHUB_WEBHOOK_SECRET` to enable deployment hooks.
The application disables webhook routes when one value is missing.
Configure GitHub to send push events to the externally reachable webhook address.
Use `https://router.example:9301/api/github/webhook` when a proxy provides TLS.
Forward the webhook path to `127.0.0.1` on `WEBHOOK_PORT`.

The listener requires `application/json` with a JSON object body.
It returns HTTP 415 for non-JSON content types and HTTP 400 for JSON values that are not objects.

Set the GitHub secret to the same value as `GITHUB_WEBHOOK_SECRET`.
The listener checks the `x-hub-signature-256` signature against the raw request body.
It deploys pushes to `CORE_GITHUB_BRANCH`, which defaults to `main`.
It ignores other event types and branches.
It returns HTTP 202 for a request ID the server accepted.
It retries admission for a request ID that received HTTP 409 earlier.

## Deployment behavior

The webhook accepts a valid push asynchronously and returns HTTP 202 while deployment runs.
It returns HTTP 409 when deployment is in progress.
It returns HTTP 401 for an invalid signature and HTTP 503 when deployment settings are missing.
It requires a clean repository before it starts a deployment.
It checks that the repository remains clean after Git pull and each npm validation command.
If a check finds changes, the sequence stops and recovery restores the previous commit.

The server rejects JSON request bodies larger than 1 MiB.
It remembers the most recent 1000 GitHub request IDs in memory.
An older request ID can run again after the application removes it from that cache.
On a GitHub retry after a busy response, the server tries deployment admission again.
While a deployment runs, it returns HTTP 409.

The application records the local commit before `git pull` as its recovery target.
Check out `CORE_GITHUB_BRANCH` in the configuration repository before starting the application.

It runs `git pull --ff-only -- origin <branch>`, `npm ci --include=dev`, `npm test`, and `npm run preflight` in order.
When the catalog exists, it compares the commit before pull with the commit after pull.
It applies actions only to components that own changed paths.
For file moves, Git reports both paths for component matching.
If the catalog file changes, it runs every component action.
If no catalog exists, it runs `npm run reload` after the validation steps pass.

It stops the sequence at the first failed command.
If a command fails before reload, the application resets the repository to the previous commit without reloading router processes.
If the new reload fails, the application resets the repository and attempts to reload the previous configuration.
If Git cannot restore the previous commit, the application records that failure and does not reload the current configuration.

When `npm ci` changes the installed `@eliware/core` version, Core schedules a systemd worker to stop and start `core.service` after configuration reload succeeds.
The worker checks `/ready` on the dashboard port and records the result in the Git metadata directory.
If Core fails its health check, the worker restores the previous commit and dependencies, reloads prior settings, and starts the previous Core version.
The dashboard keeps the final result after Core starts again.
The worker sends the final deployment notification after the health check.
Keep `core.service` and the Git metadata directory writable by the Core account.

The application preserves untracked files during recovery.
Git ignored files such as `.env` and `node_modules` also remain on disk during deployment and recovery.
Set the systemd unit umask to `0022` so router processes can read files that Git pulls.
The dashboard shows the latest deployment result until the process restarts.

The application creates decimal deployment IDs with `@eliware/common` snowflakes.
Set a unique worker and process pair for every active instance. The application exits when one value is missing or invalid.

## Health monitoring and notifications

When `core-catalog.yaml` exists in the configuration repository, the dashboard monitors its component health units.
It also monitors units from `CORE_HEALTH_UNITS`, such as `core.service`.
If no catalog exists, set `CORE_HEALTH_UNITS` to a comma-separated list of systemd unit names.
The application checks each unit at startup and every five minutes.
The application marks a unit unhealthy when its systemd check runs longer than ten seconds.
An empty list reports the monitored units as unconfigured.

The dashboard refreshes every 30 seconds.
Run `npm run build` and then `node bin/copy-web-assets.mjs` to refresh packaged browser bundles.
The server refreshes health checks and metric sources every five minutes.
The server keeps the latest metric summary and totals in memory.
It does not use a database or keep historical metric samples.
The dashboard collects interface, route, IPv4 neighbor, FRR, and VRRP status without a catalog.

Use component `metrics` entries in `core-catalog.yaml` to add or configure other metrics.
The dashboard collects every metric entry set by the operator.
It displays a separate result for each metric entry.
The dashboard shows each result timestamp and marks a source unavailable when its local interface fails.

Interface data comes from `ip -j -s address show` and includes addresses, link state, and traffic totals.
The routing table comes from `ip -j route show table all`.
The IPv4 neighbor table comes from `ip -4 -j neigh show` and includes address resolution state.
FRR data comes from `vtysh` BGP summary and route commands.
The dashboard shows FRR peer states and its route table.

The dashboard shows a maximum of 100 entries in each table and reports the full total.
VRRP data comes from the Keepalived JSON state dump and includes instance state, virtual addresses, and advertisement counters.
Core verifies the configured PID belongs to Keepalived before it sends the platform-specific JSON signal.
It reads the Keepalived parent PID file and its process name from `/proc`.
Set `path` and `pidPath` in a catalog `vrrp` metric when Keepalived uses non-default files.

Read HAProxy counters from its configured Unix socket.
DHCP lease totals come from a configured ISC DHCP, dnsmasq, or Kea CSV lease file.
Name-server cache totals come from the configured cache statistics file.
Chrony synchronization data comes from `chronyc -n tracking`.
The dashboard reports missing or unreadable files, sockets, and commands as unavailable data.
The Core process needs permission to run `vtysh`, read local status files, and signal Keepalived.

Set `DISCORD_WEBHOOK_URL` to send deployment and health notifications as Discord rich embeds.
The application sends one health notification when a unit first becomes unhealthy.

The application also follows systemd journal events for configured health units.
It updates dashboard health after a unit stops, fails, or restarts.
It reports the component, event time, systemd state, and dashboard link in a Discord embed.
It sends one failure notification until the unit recovers and fails again.
Give the Core process permission to read the system journal.
If the event stream is unavailable, the five-minute health checks continue.

The deployment uses catalog path mappings to select changed components.
It runs each selected component's systemd `reload` or `restart` action.
Preflight fails when a file under `etc/`, `var/`, or `scripts/` has no component mapping.
If no catalog exists, it runs `npm run reload` for compatibility.

Deployment embeds list the repository, branch, commit links, changed files, elapsed time, and deployment steps.
A green check marks a completed deployment. A red cross marks a failed deployment and includes recovery details when available.

`/health` reports process liveness and `/ready` reports listener readiness.
`/api/status` reports monitored unit health, the latest metric snapshot, and the latest deployment result.

Keep `.env` out of Git. The example file contains placeholders only.

The package version, repository URLs, and release tags are metadata or deployment settings.
They do not change the runtime server configuration.

## Routes

The server serves the app page, built browser files, public assets, and status routes.

| Method | Path                               | Result                                                                                    |
| ------ | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `GET`  | `/`                                | Serves `public/index.html`.                                                               |
| `GET`  | `/client.js`                       | Serves the packaged client bundle from `public/client.bundle`.                            |
| `GET`  | `/styles.css`                      | Serves `public/styles.css`.                                                               |
| `GET`  | `/service-worker.js`               | Serves the packaged worker bundle from `public/service-worker.bundle`.                    |
| `GET`  | `/manifest.webmanifest`            | Serves app install metadata.                                                              |
| `GET`  | `/icons/template.svg`              | Serves the general app icon.                                                              |
| `GET`  | `/icons/template-maskable.svg`     | Serves the scalable maskable icon.                                                        |
| `GET`  | `/icons/template-192.png`          | Serves the 192 by 192 pixel icon.                                                         |
| `GET`  | `/icons/template-512.png`          | Serves the 512 by 512 pixel icon.                                                         |
| `GET`  | `/icons/template-maskable-512.png` | Serves the 512 by 512 pixel maskable icon.                                                |
| `GET`  | `/screenshots/core-desktop.png`    | Serves the desktop preview.                                                               |
| `GET`  | `/screenshots/core-mobile.png`     | Serves the mobile preview.                                                                |
| `GET`  | `/health`                          | Returns `{"status":"ok"}`.                                                                |
| `GET`  | `/ready`                           | Returns HTTP 200 after both listeners start. Returns HTTP 503 during startup or shutdown. |
| `GET`  | `/api/status`                      | Returns health and deployment status.                                                     |

Unsupported methods on page and asset routes return HTTP 405.
Unknown paths return HTTP 404.

The webhook listener accepts `POST /api/github/webhook` on `WEBHOOK_PORT`.
The dashboard cannot edit configuration or launch deployments.
The dashboard has no user authentication. Allow proxy and firewall access from approved clients only.

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

The public npm package includes the CLI and web application.
Its tarball contains `bin/`, `src/`, `public/`, `docs/`, `specs/`, and the package documentation.
The tarball does not include tests, `node_modules/`, generated `dist/` files, or the lockfile.
It ships `public/client.bundle` and `public/service-worker.bundle` as browser assets.
The `prepack` script rebuilds and copies these bundles before `npm pack` or `npm publish`.

The npm workflow validates tagged releases and publishes the package with provenance.
Use a numeric `MAJOR.MINOR.PATCH` version and a matching `vMAJOR.MINOR.PATCH` release tag.
Follow the approved release process before publication.

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

`npm test` runs the configured `eliware-test` checks for this repository.
The checks include tests, lint, formatting, dependency audits, package rules, and the browser build.
Run `npm run build` to build browser assets directly.
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
If `/client.js` returns HTTP 404, run `npm run build` and `node bin/copy-web-assets.mjs`.
Then confirm that `public/client.bundle` exists.

If an API request returns HTTP 400, check its path, query, and JSON body against the schema above.
If offline loading fails, reload after the worker controls the page and cache the app shell.
If browser checks cannot start Chrome, run `npm run puppeteer` before the checks.
