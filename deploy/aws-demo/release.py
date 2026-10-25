#!/usr/bin/env python3
"""Explicit host release. Pulls approved immutable images; never runs Terraform or builds on EC2."""
import argparse
import fcntl
import json
import os
import pathlib
import re
import subprocess
from common import ROOT, compose, config, host_identity, owner_approval, pg
from backup import backup


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-synthetic-demo", action="store_true", required=True)
    parser.add_argument("--initial-seed", action="store_true")
    args = parser.parse_args()
    os.umask(0o077)
    values = config()
    host_identity(values)
    owner_approval(values)
    secret_dir = pathlib.Path(values.get("ABOX_SECRETS_DIR", "/etc/abox/secrets"))
    if secret_dir.is_symlink() or secret_dir.stat().st_uid != 0 or secret_dir.stat().st_mode & 0o077:
        raise RuntimeError("Runtime secret directory must be root-owned and mode 0700")
    for name in ["admin_password", "app_password", "jwt_secret", "demo_password"]:
        if not re.fullmatch(r"[a-f0-9]{64}", (secret_dir / name).read_text().strip()):
            raise RuntimeError("Missing or invalid runtime secret file")
    compose("config", "--quiet")
    compose("--profile", "maintenance", "pull")
    for service in ["BACKEND_IMAGE", "FRONTEND_IMAGE"]:
        raw = subprocess.check_output(["docker", "image", "inspect", values[service]], text=True)
        image = json.loads(raw)[0]
        if image["Architecture"] != "arm64" or image["Config"].get("Labels", {}).get("org.opencontainers.image.revision") != values["RELEASE_SHA"]:
            raise RuntimeError("Image architecture/revision does not match the release")
    compose("up", "-d", "--wait", "database")
    count = pg("postgres", "SELECT count(*) FROM pg_database WHERE datname='abox_demo';\n")
    if int(count.stdout.strip()) != 1:
        raise RuntimeError("Database preflight failed")
    # Existing application processes are stopped before one-off maintenance work.
    compose("stop", "caddy", "frontend", "backend")
    backup(values)
    # Exactly one migrator invocation per release. An error leaves the web stack
    # stopped for operator recovery; no seed, automatic downgrade, or blind retry.
    compose("--profile", "maintenance", "run", "--rm", "--no-deps", "migrate")
    if args.initial_seed:
        result = pg(values.get("DATABASE_NAME", "abox_demo"), 'SELECT count(*) FROM "User";\n')
        if int(result.stdout.strip()) != 0:
            raise RuntimeError("Initial demo seed requires an empty user table")
        compose("--profile", "maintenance", "run", "--rm", "--no-deps", "seed")
    compose("up", "-d", "--wait", "backend", "frontend", "caddy")
    current = ROOT.parent.parent / "current"
    replacement = current.with_name("current.next")
    if replacement.exists() or replacement.is_symlink():
        raise RuntimeError("Unexpected pending release symlink; inspect manually")
    replacement.symlink_to(ROOT)
    replacement.replace(current)
    print("Release is healthy; current symlink updated. Verify HTTPS/login from a browser.")


if __name__ == "__main__":
    with open("/run/abox-maintenance.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        main()
