# Release Notes

## 15.2.3 — 2026-11-19

### Changed

- Hide internal repository checks from the deployment dashboard.
- Send detailed Discord deployment embeds with linked commits and deployment results.
- Add a shared router component catalog for preflight, health monitoring, and targeted reloads.
- Stop and start Core after a deployment changes its installed package version. Restore the prior version when health checks fail.
- Add catalog-driven CLI commands for component status checks and reload actions.
- Include both paths of moved files when selecting deployment actions.
- Show current router metrics and keep only the latest in-memory summary.
- Follow systemd unit events for prompt health updates and single Discord notifications.

## 15.2.2 — 2026-11-18

### Changed

- Set the package version to 15.2.2.
- Move Lighthouse and Puppeteer to development dependencies.
- Document aggregate test checks, browser builds, webhook payloads, and busy request retries.
- Organize deployment tests by admission, recovery, setup failure, and workflow behavior.

### Fixed

- Require quoted DNS TXT values and validate DNS include paths.
- Validate HAProxy server addresses and port ranges.
- Record unknown health results when a health check fails unexpectedly.
- Keep asset reads inside their configured roots and preserve read results when file close fails.
- Retry deployment lock cleanup before admitting later work.
- Use user-specific lock directories when the operating system does not provide user IDs.
- Pass configured Snowflake worker and process IDs to the deployment manager.
- Require JSON object payloads for GitHub webhooks and retry busy requests when GitHub resends them.
- Add regression coverage for Keepalived CRLF input and firewall rules with undeclared chains.

## 15.2.1 — 2026-11-18

### Changed

- Set package metadata and the lockfile to 15.2.1.
- Split configuration, health, deployment, and validation helpers into focused modules.
- Update the README, CLI guide, web guide, and contributor guidance for 15.2.1.
- Document screenshot output settings, package checks, runtime environment values, and route behavior.

### Fixed

- Accept approved system-managed DNS includes during repository preflight.
- Compare reciprocal FRR preferences while allowing unchanged external peer weights.
- Validate DNS owners, SOA names and timers, MX, SRV, CAA, and TXT record values.
- Accept valid empty TXT strings and quoted Keepalived option values.
- Reject duplicate BGP sections, repeated firewall tables, and duplicate Keepalived settings.
- Reject subnet and final host addresses as Keepalived virtual addresses.
- Resolve configuration references inside symlinked repository roots.
- Read web assets through verified file handles to prevent path changes during reads.
- Require explicit snowflake worker and process identities.
- Check Git status, branch, and revision results before deployment.
- Use private lock directories and release admission state after lock cleanup errors.
- Keep busy webhook request IDs from starting deployments on retries.
- Bound concurrent health checks and report readiness only after both listeners start.

## 15.2.0 — 2026-11-18

### Added

- Provide `core-cli preflight` to validate router configuration repositories with Node.js.
- Check supported configuration syntax, required settings, formatting, and shell scripts during preflight.
- Provide `core-cli compare <partner repo>` to check configuration consistency and reciprocal HA settings.
- Provide `core-web` with a read-only health dashboard and a separate GitHub webhook listener.
- Validate webhook deployments before reloading services and restore the previous commit when a deployment step fails.
- Monitor configured systemd units and send Discord rich embed notifications for health and deployment events.
