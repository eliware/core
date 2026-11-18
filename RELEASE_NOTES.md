# Release Notes

## 15.2.0 — 2026-11-18

### Changed

- Update package dependencies to their latest releases.
- Allow expected FRR route preference variation during pair compare.
- Include development dependencies during router deployment checks.

### Added

- Add a read-only router health dashboard with a separate GitHub webhook listener.
- Add ordered deployments, commit recovery, systemd monitoring, and Discord embed notifications.
- Add `core-cli preflight` to check router repository formatting and supported file syntax.
- Validate required router settings with Node.js without calling router tools.
- Check shell script syntax with `bash -n` during preflight.
- Add `core-cli compare <partner repo>` to validate matching configuration and reciprocal HA settings.
