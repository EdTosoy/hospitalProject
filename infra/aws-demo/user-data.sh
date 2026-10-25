#!/bin/bash
set -euo pipefail
umask 077

test "$(uname -m)" = aarch64
dnf install -y docker curl jq
systemctl enable --now docker
systemctl enable --now amazon-ssm-agent

# Verify the downloaded ARM64 Compose plugin against the release checksum list.
# This bootstraps tools only. No application secrets, databases, or containers.
compose_version=v5.4.0
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
curl --fail --silent --show-error --location \
  "https://github.com/docker/compose/releases/download/$compose_version/docker-compose-linux-aarch64" \
  --output "$work/docker-compose-linux-aarch64"
curl --fail --silent --show-error --location \
  "https://github.com/docker/compose/releases/download/$compose_version/checksums.txt" \
  --output "$work/checksums.txt"
(cd "$work" && grep ' docker-compose-linux-aarch64$' checksums.txt | sha256sum --check --strict)
install -d -m 0755 /usr/local/lib/docker/cli-plugins
install -m 0755 "$work/docker-compose-linux-aarch64" /usr/local/lib/docker/cli-plugins/docker-compose
install -d -m 0700 /etc/abox /etc/abox/secrets /var/lib/abox /opt/abox/releases
docker compose version
