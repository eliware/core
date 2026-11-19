# Release Notes

## 15.2.2 — 2026-11-18

### Changed

- Move Lighthouse and Puppeteer to development dependencies.

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
