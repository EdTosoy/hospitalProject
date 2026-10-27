"""Operator-only deployment helpers. Never import from application runtime code."""
import datetime as dt
import hashlib
import json
import os
import pathlib
import platform
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent


def config():
    values = {}
    for line in (ROOT / "release.env").read_text().splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    required = {"RELEASE_SHA", "BACKEND_IMAGE", "FRONTEND_IMAGE", "POSTGRES_IMAGE", "CADDY_IMAGE", "BACKUP_BUCKET", "EXPECTED_ACCOUNT_ID"}
    if not required <= values.keys():
        raise RuntimeError("Incomplete release configuration")
    if not values.keys() <= required | {"DATABASE_NAME", "ABOX_SECRETS_DIR"}:
        raise RuntimeError("Unknown configuration keys; secrets and AWS credentials do not belong here")
    sha = values["RELEASE_SHA"]
    if not re.fullmatch(r"[a-f0-9]{40}", sha) or sha == "0" * 40:
        raise RuntimeError("An immutable release SHA is required")
    for service in ["backend", "frontend"]:
        if not re.fullmatch(rf"ghcr\.io/[a-z0-9-]+/abox-{service}:sha-{sha}@sha256:[a-f0-9]{{64}}", values[f"{service.upper()}_IMAGE"]):
            raise RuntimeError("Use matching GHCR SHA tags plus immutable digests")
    for key, prefix in [("POSTGRES_IMAGE", "postgres:17-alpine"), ("CADDY_IMAGE", "caddy:2-alpine")]:
        if not re.fullmatch(re.escape(prefix) + r"@sha256:[a-f0-9]{64}", values[key]):
            raise RuntimeError("Infrastructure images must be digest pinned")
    if not re.fullmatch(r"[0-9]{12}", values["EXPECTED_ACCOUNT_ID"]) or values["EXPECTED_ACCOUNT_ID"] == "0" * 12:
        raise RuntimeError("An owner-confirmed account ID is required")
    if not re.fullmatch(r"abox-demo-backups-" + values["EXPECTED_ACCOUNT_ID"] + r"-[a-z0-9]{6,16}", values["BACKUP_BUCKET"]):
        raise RuntimeError("Unexpected backup bucket")
    if not re.fullmatch(r"abox_(demo|restore_[0-9]{14})", values.get("DATABASE_NAME", "abox_demo")):
        raise RuntimeError("Only synthetic demo databases are supported")
    if not pathlib.Path(values.get("ABOX_SECRETS_DIR", "/etc/abox/secrets")).is_absolute():
        raise RuntimeError("Use an absolute secret directory")
    return values


def compose(*args, **kwargs):
    # Shell variables must not override the reviewed release file's images/account.
    kwargs["env"] = {**os.environ, **config(), "ABOX_PLATFORM": "linux/arm64"}
    return subprocess.run([
        "docker", "compose", "--env-file", str(ROOT / "release.env"),
        "-f", str(ROOT / "compose.yml"), *args,
    ], check=True, **kwargs)


def aws(values, *args):
    # Host operations use only the EC2 role, never an operator/default/Flow profile.
    env = {key: value for key, value in os.environ.items() if not key.startswith("AWS_")}
    env.update(AWS_CONFIG_FILE="/dev/null", AWS_SHARED_CREDENTIALS_FILE="/dev/null", AWS_REGION="ap-southeast-1", AWS_EC2_METADATA_DISABLED="false")
    result = subprocess.run(["aws", "--region", "ap-southeast-1", "--no-cli-pager", *args, "--output", "json"],
                            check=True, env=env, capture_output=True, text=True)
    return json.loads(result.stdout or "{}")


def host_identity(values):
    if os.geteuid() != 0 or platform.machine() not in ["aarch64", "arm64"]:
        raise RuntimeError("Production operations require root on the authorized ARM64 demo host")
    if aws(values, "sts", "get-caller-identity")["Account"] != values["EXPECTED_ACCOUNT_ID"]:
        raise RuntimeError("Wrong AWS account; refusing operation")


def owner_approval(values):
    record = json.loads(pathlib.Path("/etc/abox/account-approval.json").read_text())
    now = dt.datetime.now(dt.timezone.utc)
    if (record.get("account_sha256") != hashlib.sha256(values["EXPECTED_ACCOUNT_ID"].encode()).hexdigest()
            or record.get("plan") != "FREE" or record.get("status") != "ACTIVE"
            or not record.get("credit_runway_verified")
            or record.get("region") != "ap-southeast-1"
            or now >= dt.datetime.fromisoformat(record["valid_until"])):
        raise RuntimeError("Fresh owner Free-plan/account approval is required")


def pg(database, sql):
    return compose("exec", "-T", "database", "sh", "-c",
                   'export PGPASSWORD="$(cat /run/secrets/admin_password)"; exec psql --no-psqlrc --tuples-only --no-align -h 127.0.0.1 -U postgres -d "$1" -v ON_ERROR_STOP=1',
                   "pg", database, input=sql.encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
