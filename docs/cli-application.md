# CLI guide

This guide explains how to validate one router repository and compare a high availability pair.

## Requirements

Use Node.js 26 or later and install the package in each router configuration repository.
Install Bash when the repository contains shell scripts. Preflight runs `bash -n` on those scripts.

## Commands

| Command                           | Purpose                                 |
| --------------------------------- | --------------------------------------- |
| `core-cli`                        | Print help.                             |
| `core-cli --help`                 | Print help.                             |
| `core-cli --version`              | Print the package version.              |
| `core-cli preflight`              | Validate the current router repository. |
| `core-cli compare <partner repo>` | Validate two partner repositories.      |

Run `core-cli preflight` from the root of a router configuration repository.
Run `core-cli compare ../partner` from each repository.
The compare command accepts a filesystem path to the partner repository.
The commands do not call router-native validators, reload services, or change router configuration.

Use `--help` or `--version` only as the sole argument.
The compare command requires exactly one non-empty partner path.

## Preflight checks

Preflight checks formatting, package metadata, required files, syntax, and supported configuration files.
It verifies that `package.json` and `package-lock.json` identify the same supported package and version.
The package name and version must match the package lock file.
It parses JSON, JSONC, YAML, and Kea configuration files.
It runs `node --check` on JavaScript module files and `bash -n` on shell scripts.
It validates supported files under `etc/`, `var/`, and `scripts/` with the bundled Node.js validators.

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
Each router may use different FRR weights when the neighbor rankings are reciprocal.
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

## Related documentation

Read the [web application guide](web-application.md) for webhook deployment and dashboard operations.
Read the [release notes](../RELEASE_NOTES.md) for version history.
