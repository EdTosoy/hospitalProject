#!/usr/bin/env python3
"""Host-only setup, never Terraform/user-data/CI. Does not print secrets or overwrite files."""
import os
import pathlib
import secrets
import sys

target = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/etc/abox/secrets")
if not target.is_absolute() or target.is_symlink():
    raise SystemExit("Use an absolute private directory outside the checkout")
repo = pathlib.Path(__file__).resolve().parents[2]
if target.resolve().is_relative_to(repo):
    raise SystemExit("Secret storage inside the repository is prohibited")
target.mkdir(parents=True, exist_ok=True, mode=0o700)
if target.stat().st_mode & 0o077:
    raise SystemExit("Secret directory must have mode 0700")
names = ["admin_password", "app_password", "jwt_secret", "demo_password"]
if any((target / name).exists() for name in names):
    raise SystemExit("Existing secrets detected; refusing partial setup or rotation")
for name in names:
    fd = os.open(target / name, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o400)
    with os.fdopen(fd, "w") as handle:
        handle.write(secrets.token_hex(32) + "\n")
        # Compose file secrets are bind mounts: preserve readable mount contents
        # for Node UID 1000 and PostgreSQL UID 70. The host parent stays 0700.
        os.fchmod(handle.fileno(), 0o444)
print("Created four runtime secrets in the private directory; no values printed.")
