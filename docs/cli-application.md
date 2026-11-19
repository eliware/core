# CLI guide

This guide explains how to validate one router repository and compare a high availability pair.

## Requirements

Use Node.js 26 or later and install the package in each router configuration repository.
Install Bash when the repository contains shell scripts. Preflight runs `bash -n` on those scripts.

## Commands

| Command                                       | Purpose                                 |
| --------------------------------------------- | --------------------------------------- |
| `core-cli`                                    | Print help.                             |
| `core-cli --help`                             | Print help.                             |
| `core-cli --version`                          | Print the package version.              |
| `core-cli preflight`                          | Validate the current router repository. |
| `core-cli catalog`                            | List configured router components.      |
| `core-cli compare <partner repo>`             | Validate two partner repositories.      |
| `core-cli status [component] [--repo <path>]` | Check catalog health units.             |
| `core-cli reload [component] [--repo <path>]` | Run catalog reload actions.             |

Run `core-cli preflight` from the root of a router configuration repository.
Run `core-cli compare ../partner` from each repository.
The compare command accepts a filesystem path to the partner repository.
Preflight and compare do not call router-native validators or change router configuration.
Preflight validates `core-catalog.yaml` when the repository contains it.
The catalog command lists each component and its configuration paths.

## Status and reload operations

Run `core-cli status` from a router repository to check every catalog health unit.
Add a component ID to check only that component.
Use `--repo <path>` to select a router repository. Relative paths start from the current directory.
The default repository path is the current directory.

Status runs `systemctl is-active --quiet` for each distinct selected health unit.
It prints one healthy or unhealthy result for every selected component.
Status returns code `0` when every selected unit is active.
Status returns code `1` when the catalog is missing or any unit is not active.
Status returns code `2` when the command syntax is invalid or the component ID is unknown.

Run `core-cli reload` to run each distinct catalog action.
Add a component ID to run only that component's action.
Reload runs the configured `systemd` operation, which must be `reload` or `restart`.
It stops after the first failed action and reports that action.

Reload returns code `0` when every selected action succeeds.
Reload returns code `1` when the catalog is missing or an action fails.
Reload returns code `2` when the command syntax is invalid or the component ID is unknown.
The reload command changes running services. Check the selected component before you run it.

## Router component catalog

Create `core-catalog.yaml` in the router repository to define managed components.
Use version `1` and list at least one component.
Set a unique lowercase `id` and a readable `name` for each component.
List exact configuration paths or directory patterns that end in `/**`.
Map each maintained file under `etc/`, `var/`, and `scripts/` to a component.
Set `health.type` and `action.type` to `systemd`.

Set the health unit to a systemd unit.
Set the action operation to `reload` or `restart` and name its unit.
Keep paths relative to the repository.
Keep secrets and host network settings out of the catalog.
Add `metrics` entries to components when the web dashboard reports their runtime totals.

```yaml
version: 1
components:
  - id: dns
    name: DNS
    configPaths:
      - etc/named.conf
      - var/named/**
    health:
      type: systemd
      unit: named.service
    action:
      type: systemd
      operation: reload
      unit: named.service
    metrics:
      - type: dns-cache
        path: /var/cache/bind/named.stats
```

Use `interfaces` to read interface addresses, link state, and traffic counters with `ip -j -s address show`.
Use `haproxy` with a local Unix socket path to read `show stat` counters.
Use `dhcp-leases` with `format` set to `isc`, `dnsmasq`, or `kea-csv` and an absolute lease file path.
Use `dns-cache` with the path to a name-server statistics dump.
Use `ntp` to read chrony tracking data with `chronyc -n tracking`.

The dashboard marks an unavailable source and shows its check time and error.
The application keeps the latest metric snapshot in memory and refreshes it every five minutes.
It does not store metrics in a database or keep historical samples.

The web application reads health units from the catalog when it exists.
During deployment, Core applies systemd actions to components with changed configuration paths.
The catalog file itself selects every configured component during deployment.
Preflight fails when a maintained configuration path has no component mapping.
If no catalog exists, deployment uses the repository `npm run reload` script.

Use catalog paths to create configuration links during router bootstrap.
Confirm that systemd units exist before enabling Core.
The catalog does not install operating system packages or set host network values.

Use `--help` or `--version` only as the sole argument.
The compare command requires exactly one non-empty partner path.

## Preflight checks

Preflight checks formatting, package metadata, required files, syntax, and supported configuration files.
It verifies that `package.json` and `package-lock.json` identify the same supported package and version.
The package name and version must match the package lock file.
It parses JSON, JSONC, YAML, and Kea configuration files.
It runs `node --check` on JavaScript module files and `bash -n` on shell scripts.
It validates supported files under `etc/`, `var/`, and `scripts/` with the bundled Node.js validators.

It accepts the system-managed includes `/etc/crypto-policies/back-ends/bind.config` and `/etc/named.root.key` without repository copies.

The repository must contain these paths:

- `etc/chrony.conf`
- `etc/named.conf`
- `etc/frr/daemons`
- `etc/frr/frr.conf`
- `etc/haproxy/haproxy.cfg`
- `etc/kea/kea-dhcp4.conf`
- `etc/kea/kea-dhcp6.conf`
- `etc/kea/kea-dhcp-ddns.conf`
- `etc/kea/kea-ctrl-agent.conf`
- `etc/keepalived/keepalived.conf`
- `etc/conntrackd/conntrackd.conf`
- `etc/sysconfig/iptables`
- `etc/sysconfig/ip6tables`
- `etc/wireguard/wg0.conf`

Preflight can create ignored test coverage or log files. It does not reload services.

## Pair validation

Compare checks that both repositories have different package names.
It compares the file inventory and contents under `etc/`, `var/`, and `scripts/`.
It permits only documented HA-specific differences and checks that paired values agree or use reciprocal partner values.

Pair checks include FRR peer addresses, autonomous system numbers, and neighbor sets.
Compare checks reciprocal rankings for external neighbors with changed weights.
Neighbors with equal weights in both repositories do not change the ranking check.

They include Kea DHCPv4 HA roles and URLs, Keepalived VRRP IDs and virtual addresses, and reciprocal priorities.
They also include conntrackd peer identifiers and FRR connected prefix identifiers.
Other unexpected file or content differences fail the compare command.
The compare command reads files and does not invoke router-native tools.

## Exit codes

| Code | Meaning                                                       |
| ---- | ------------------------------------------------------------- |
| `0`  | The command completed successfully.                           |
| `1`  | Repository or pair validation failed.                         |
| `2`  | The command received invalid syntax or an unsupported option. |

## Troubleshooting

If preflight reports a missing required file, add the path to the router repository.
If shell validation cannot start, install Bash and make `bash` available on `PATH`.
If preflight reports formatting errors, run `npm run format` and inspect the changes.
If compare reports a difference, inspect both files and correct the unexpected value.
If compare reports a peer mismatch, check reciprocal addresses and HA roles in both repositories.
If compare reports an FRR ranking mismatch, inspect changed neighbor rankings on both routers.

## Related documentation

Read the [web application guide](web-application.md) for webhook deployment and dashboard operations.
Read the [release notes](../RELEASE_NOTES.md) for version history.
