#!/usr/bin/env python3
"""Host backup: synthetic DB -> bounded encrypted S3 object, with no credentials printed."""
import datetime as dt
import fcntl
import json
import os
import pathlib
import tempfile
from common import aws, compose, config, host_identity


def backup(values):
    os.umask(0o077)
    host_identity(values)
    root = pathlib.Path("/var/lib/abox")
    root.mkdir(mode=0o700, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="backup-", dir=root) as directory:
        dump = pathlib.Path(directory) / "database.dump"
        with dump.open("wb") as handle:
            compose("exec", "-T", "database", "sh", "-c",
                    'export PGPASSWORD="$(cat /run/secrets/app_password)"; exec pg_dump -h 127.0.0.1 -U abox_app -d "$1" --format=custom --compress=1 --no-owner --no-acl',
                    "dump", values.get("DATABASE_NAME", "abox_demo"), stdout=handle)
        size = dump.stat().st_size
        if not 0 < size <= 500 * 1024**2:
            raise RuntimeError("Backup size outside the demo's 500 MiB bound")
        listing = aws(values, "s3api", "list-objects-v2", "--bucket", values["BACKUP_BUCKET"], "--prefix", "demo/", "--expected-bucket-owner", values["EXPECTED_ACCOUNT_ID"])
        if sum(item["Size"] for item in listing.get("Contents", [])) + size > 5 * 1024**3:
            raise RuntimeError("Backup storage cap reached; inspect lifecycle, do not delete recovery points automatically")
        key = "demo/" + dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".dump"
        aws(values, "s3api", "put-object", "--bucket", values["BACKUP_BUCKET"], "--key", key,
            "--body", str(dump), "--server-side-encryption", "AES256", "--checksum-algorithm", "SHA256",
            "--expected-bucket-owner", values["EXPECTED_ACCOUNT_ID"])
        head = aws(values, "s3api", "head-object", "--bucket", values["BACKUP_BUCKET"], "--key", key,
                   "--expected-bucket-owner", values["EXPECTED_ACCOUNT_ID"])
        if head.get("ContentLength") != size or head.get("ServerSideEncryption") != "AES256":
            raise RuntimeError("Backup verification failed")
        print("Verified encrypted demo backup uploaded; temporary dump removed on exit.")
        return key


if __name__ == "__main__":
    with open("/run/abox-maintenance.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        backup(config())
