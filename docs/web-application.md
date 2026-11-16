# Web application guide

This guide explains how to install, configure, run, test, and adapt the Core web application.

## Contents

- [Get started](#get-started)
- [Configuration](#configuration)
- [Routes and API example](#routes-and-api-example)
- [Browser app and offline behavior](#browser-app-and-offline-behavior)
- [Browser validation](#browser-validation)
- [npm publication](#npm-publication)
- [Extend the web app](#extend-the-web-app)
- [Validate changes](#validate-changes)
- [Troubleshooting](#troubleshooting)

## Get started

Install Node.js 26 or later.

Run these commands from the repository root:

```sh
npm ci
npm run build
node bin/core-web.mjs
```

Open `http://localhost:9300/` to view the app. The server listens on port `9300` by default.

## Configuration

The server reads optional values from the process environment and the `.env` file.
Copy `.env.example` to `.env`, then uncomment or edit its values.

| Name        | Required | Default | Accepted values                                                  |
| ----------- | -------- | ------- | ---------------------------------------------------------------- |
| `PORT`      | No       | `9300`  | An integer from `1` through `65535`.                             |
| `LOG_LEVEL` | No       | `info`  | `error`, `warn`, `info`, `http`, `verbose`, `debug`, or `silly`. |

The server rejects an invalid `PORT` value before it opens a connection.
The `LOG_LEVEL` value sets the minimum level for application log messages.

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
| `POST` | `/api/examples/:exampleId`         | Validates and returns an API example.      |

Unsupported methods on page and asset routes return HTTP 405.
Unknown paths return HTTP 404.

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

The screenshot command saves desktop and mobile images under the ignored `artifacts/` directory.
Set `WEB_URL` to change the server address.
Set `SCREENSHOT_PATH` to select a screenshot output file.

The Lighthouse command writes its report to `artifacts/lighthouse.json`.
It checks performance, best practices, SEO, and accessibility.
Puppeteer then checks the manifest, install icons, preview images, worker control, and offline page load.
The audit passes when each check passes and the Accessibility score is at least 95 out of 100.
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

The aggregate command checks tests, lint, formatting, dependencies, and the browser build.
Run focused tests by passing one or more test file paths:

```sh
npm test -- tests/backend/config.test.mjs
npm test -- tests/backend/config.test.mjs tests/frontend/service/worker.test.mjs
```

Run `npm run lint`, `npm run audit`, and `npm run format:check` to run individual checks.
Run `npm run format` to apply the repository formatter.

## Troubleshooting

If the server rejects `PORT`, set an integer from `1` through `65535`.
If the server cannot open its port, stop the process that uses it or set a different port.
If `/client.js` returns HTTP 404, run `npm run build` and confirm that `dist/client.js` exists.

If an API request returns HTTP 400, check its path, query, and JSON body against the schema above.
If offline loading fails, reload after the worker controls the page and cache the app shell.
If browser checks cannot start Chrome, run `npm run puppeteer` before the checks.
