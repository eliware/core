# Release Notes

## 15.2.1 — 2026-11-18

### Fixed

- Accept approved system-managed DNS includes during repository preflight.
- Compare reciprocal FRR preferences when some external peers use equal baseline weights.
- Reject duplicate BGP sections, repeated firewall tables, and malformed DNS record fields.
- Reject duplicate required Keepalived settings and invalid virtual addresses.
- Require explicit snowflake identities and validate Git deployment recovery targets.
- Keep webhook request handling idempotent when a deployment is busy.
- Deployment locks use a private directory for the application user.
- Keep `/ready` at HTTP 503 until both listeners start and after shutdown begins.

## 15.2.0 — 2026-11-18

### Added

- Provide `core-cli preflight` to validate router configuration repositories with Node.js.
- Check supported configuration syntax, required settings, formatting, and shell scripts during preflight.
- Provide `core-cli compare <partner repo>` to check configuration consistency and reciprocal HA settings.
- Provide `core-web` with a read-only health dashboard and a separate GitHub webhook listener.
- Validate webhook deployments before reloading services and restore the previous commit when a deployment step fails.
- Monitor configured systemd units and send Discord rich embed notifications for health and deployment events.
