#!/usr/bin/env python3
"""Restore into a NEW synthetic candidate DB; never overwrite or switch the active DB."""
import argparse
import datetime as dt
import fcntl
import pathlib
import re
import tempfile
from common import aws, compose, config, host_identity, owner_approval, pg


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm-synthetic-restore", action="store_true", required=True)
    parser.add_argument("--key", required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"demo/[0-9]{8}T[0-9]{12}Z\.dump", args.key):
        raise RuntimeError("Unexpected backup key")
    values = config()
    host_identity(values)
    owner_approval(values)
    target = "abox_restore_" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%d%H%M%S")
    with tempfile.TemporaryDirectory(prefix="restore-", dir="/var/lib/abox") as directory:
        dump = pathlib.Path(directory) / "database.dump"
        head = aws(values, "s3api", "head-object", "--bucket", values["BACKUP_BUCKET"], "--key", args.key,
                   "--expected-bucket-owner", values["EXPECTED_ACCOUNT_ID"])
        if head.get("ServerSideEncryption") != "AES256" or not 0 < head.get("ContentLength", 0) <= 500 * 1024**2:
            raise RuntimeError("Unexpected backup encryption or size")
        aws(values, "s3api", "get-object", "--bucket", values["BACKUP_BUCKET"], "--key", args.key,
            "--checksum-mode", "ENABLED", "--expected-bucket-owner", values["EXPECTED_ACCOUNT_ID"], str(dump))
        pg("postgres", f"CREATE DATABASE {target} OWNER abox_app;\n")
        with dump.open("rb") as handle:
            compose("exec", "-T", "database", "sh", "-c",
                    'export PGPASSWORD="$(cat /run/secrets/app_password)"; exec pg_restore -h 127.0.0.1 -U abox_app -d "$1" --exit-on-error --single-transaction --no-owner --no-acl',
                    "restore", target, stdin=handle)
        print(f"Restored candidate {target}; active database unchanged. Inspect before an explicitly approved cutover.")


if __name__ == "__main__":
    with open("/run/abox-maintenance.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        main()
