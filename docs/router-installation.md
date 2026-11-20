# Router installation guide

This guide describes the manual setup for a CentOS 10 router that uses `@eliware/core`.
Core does not install operating system packages, create secrets, or link configuration files.
Complete these steps on each router with the matching router configuration repository.

## Prepare CentOS

Install a minimal CentOS 10 virtual machine from its installation ISO.
Install the guest tools or drivers that the hypervisor requires.
Apply current operating system updates and reboot when the update requires it.

Install packages for the daemons listed in the router repository:

```sh
sudo dnf install -y git haproxy kea frr bind bind-utils chrony keepalived conntrack-tools iptables-services wireguard-tools policycoreutils-python-utils
```

Some packages may require an approved DNF repository.
Install more packages when the router repository or its operator guide requires them.
Install Certbot when HAProxy uses certificates managed by ACME.
Run `sudo dnf install -y certbot` when an approved enabled repository provides the package.
Use the approved package source if `dnf` cannot find Certbot.

Install the Node.js 26 runtime from the Eliware repository:

```sh
sudo curl -fsSLo /etc/yum.repos.d/nodejs26.repo https://nodejs.eliware.org/nodejs26.repo
sudo dnf install -y eliware-node26
```

Confirm that `node --version` reports version 26 or later and that `npm --version` works.
Install Bash when the router repository contains shell scripts.

## Clone the router repository

Select the repository URL and directory for this router.
Use a separate repository and directory on each router.
Add `@eliware/core` as a development dependency in the router repository.
Commit `package.json` and `package-lock.json` before you clone the repository.

```sh
sudo mkdir -p /eliware
sudo git clone <router-repository-url> /eliware/<router-name>
cd /eliware/<router-name>
sudo npm ci
```

Run `npm ci` as the account that will own the router repository.
Use `core-cli preflight` to validate the repository before linking or loading its configuration.
Run `core-cli compare <partner-repository-path>` from an administration checkout when pair validation is needed.

## Create the local environment file

Create `.env` in the router repository directory.
Use `.env.example` as a reference for available environment variables.
Set `CORE_REPO_PATH` to the absolute repository path when GitHub deployments are enabled.
Set `GITHUB_WEBHOOK_SECRET` to the matching GitHub webhook secret.
Set `DISCORD_WEBHOOK_URL` to send Discord notifications.

Set `PORT` and `WEBHOOK_PORT` to the ports used by the local proxy configuration.
Set `SNOWFLAKE_WORKER_ID` and `SNOWFLAKE_PROCESS_ID` to integers from `0` through `31`.
Use a unique worker and process pair for each active Core instance.

Create the file and edit it with `sudoedit`:

```sh
sudo install -o root -g root -m 0600 /dev/null /eliware/<router-name>/.env
sudoedit /eliware/<router-name>/.env
```

Keep `.env` out of Git and limit its access:

```sh
sudo chown root:root /eliware/<router-name>/.env
sudo chmod 0600 /eliware/<router-name>/.env
```

Do not put private keys, passwords, or certificates in `.env` unless an application config value requires them.

## Install local daemon secrets

Keep daemon secrets in the local paths that the router configuration references.
Use `/etc/wireguard/wg0.key` and `/etc/wireguard/wg0.psk` when the router configuration references those WireGuard keys.
Use `/etc/kea/kea-api-password` when the Kea control agent configuration references that password file.
Get the correct values from the approved secret source or network administrator.
Do not create replacement WireGuard keys unless the peer configuration will also change.

Create protected files, then write each value with `sudoedit`:

```sh
sudo install -o root -g root -m 0700 -d /etc/wireguard /etc/kea
sudo install -o root -g root -m 0600 /dev/null /etc/wireguard/wg0.key
sudo install -o root -g root -m 0600 /dev/null /etc/wireguard/wg0.psk
sudo install -o root -g root -m 0600 /dev/null /etc/kea/kea-api-password
sudoedit /etc/wireguard/wg0.key
sudoedit /etc/wireguard/wg0.psk
sudoedit /etc/kea/kea-api-password
```

Create only the files that the router repository uses.
Keep these files out of Git and verify that daemon accounts can read them when needed.

## Link repository configuration

Read the router repository's operator guide and `core-catalog.yaml` for the managed paths.
Create a symbolic link from each operating system configuration path to its matching repository file.
Preserve local secret files and runtime data when a managed configuration directory also contains them.
Link the repository's `core.service` unit to `/etc/systemd/system/core.service`.
Do not replace an existing system configuration until the repository passes preflight and the target path is confirmed.

Confirm that the unit uses the router repository as its working directory.
Set `EnvironmentFile` to `/eliware/<router-name>/.env`.
Set `ExecStart` to the Node.js executable and `/eliware/<router-name>/node_modules/@eliware/core/bin/core-web.mjs`.
Run `command -v node` to find the Node.js executable path.

Reload systemd after installing the unit:

```sh
sudo systemctl daemon-reload
```

Enable and start the daemons that the router repository manages.
Use its operator guide for systemd unit names, startup order, and validation commands.

## Configure SELinux for HAProxy

Keep SELinux in enforcing mode unless the system administrator approves a different policy.
Install `policycoreutils-python-utils` so the `semanage` command is available.
Check recent denials when HAProxy cannot listen on its configured port or connect to a local backend:

```sh
getenforce
sudo ausearch -m AVC -ts recent
sudo semanage port -l
```

If an AVC denial prevents HAProxy from listening on its configured TCP port, check the current port assignment.
Replace `<port>` with that port and add the HTTP port type when no conflicting assignment exists:

```sh
sudo semanage port -a -t http_port_t -p tcp <port>
```

If the port has a different assignment, confirm the existing policy and use `-m` only when a change is required.
If an AVC denial prevents HAProxy from connecting to its local backend, enable its connection boolean:

```sh
sudo setsebool -P haproxy_connect_any 1
```

That boolean allows HAProxy to connect to arbitrary ports.
Enable it only when the denial confirms that the proxy needs this access.
Read the [Red Hat Enterprise Linux 10 SELinux guide](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/using_selinux/) for policy details.

## Configure TLS certificates

Configure Certbot with the challenge method that matches the network and HAProxy listeners.
Store certificates under `/etc/letsencrypt` and keep private keys out of Git.
Install the router repository's Certbot deployment script when one exists.
Confirm that the script writes the HAProxy certificate bundle with mode `0640` and reloads HAProxy after renewal.
Test renewal with `sudo certbot renew --dry-run`.
Confirm that the configured renewal timer or scheduled task is active.

## Load the router firewall

Keep `firewalld` active until the router's tracked firewall configuration is linked and validated.
Load the repository-managed firewall rules and confirm that administrative access continues to work.
Keep console access available while changing firewall units.
Enable and start the repository's IPv4 firewall unit:

```sh
sudo systemctl enable --now iptables.service
```

Verify the firewall rules and remote access before you disable `firewalld`:

```sh
sudo systemctl disable --now firewalld
```

Enable `ip6tables.service` when the router repository manages IPv6 firewall rules.
Allow only the network traffic that the router configuration requires.

## Install and start Core

The router repository supplies `etc/systemd/system/core.service`.
The unit runs the installed package from the router repository's `node_modules` directory.
Keep the unit's working directory and environment file paths aligned with that repository.

Enable and start Core after `.env`, local secrets, configuration links, and managed daemons are configured:

```sh
sudo systemctl enable --now core.service
sudo systemctl status core.service
```

Open the configured dashboard URL and check `/health`, `/ready`, and `/api/status`.
Send a signed test push when GitHub deployment hooks are enabled.
Read the [web application guide](web-application.md) for runtime environment variables and deployment behavior.
