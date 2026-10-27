"""Offline guard tests: mocked subprocesses only, never an AWS request or deployment."""
import contextlib
import datetime as dt
import io
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
import common
import preflight


class ReleaseConfigTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.directory.name)
        self.patch = mock.patch.object(common, "ROOT", self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.addCleanup(self.directory.cleanup)
        self.values = {
            "RELEASE_SHA": "1" * 40,
            "BACKEND_IMAGE": "ghcr.io/demo/abox-backend:sha-" + "1" * 40 + "@sha256:" + "a" * 64,
            "FRONTEND_IMAGE": "ghcr.io/demo/abox-frontend:sha-" + "1" * 40 + "@sha256:" + "b" * 64,
            "POSTGRES_IMAGE": "postgres:17-alpine@sha256:" + "c" * 64,
            "CADDY_IMAGE": "caddy:2-alpine@sha256:" + "d" * 64,
            "BACKUP_BUCKET": "abox-demo-backups-123456789012-demo123",
            "EXPECTED_ACCOUNT_ID": "123456789012",
        }

    def write(self):
        (self.root / "release.env").write_text("\n".join(f"{k}={v}" for k, v in self.values.items()))

    def test_rejects_mutable_image_or_wrong_release(self):
        for value in ["ghcr.io/demo/abox-backend:latest", self.values["BACKEND_IMAGE"].replace("sha-1", "sha-2", 1)]:
            self.values["BACKEND_IMAGE"] = value
            self.write()
            with self.assertRaises(RuntimeError):
                common.config()

    def test_rejects_real_database_and_credentials_in_config(self):
        for key, value in [("DATABASE_NAME", "hospital_production"), ("AWS_ACCESS_KEY_ID", "forbidden")]:
            self.values[key] = value
            self.write()
            with self.assertRaises(RuntimeError):
                common.config()
            del self.values[key]

    def test_compose_does_not_accept_ambient_image_override(self):
        self.write()
        with mock.patch.dict(os.environ, {"BACKEND_IMAGE": "wrong:latest", "ABOX_PLATFORM": "linux/amd64"}), mock.patch.object(subprocess, "run") as run:
            common.compose("config", "--quiet")
            self.assertEqual(run.call_args.kwargs["env"]["BACKEND_IMAGE"], self.values["BACKEND_IMAGE"])
            self.assertEqual(run.call_args.kwargs["env"]["ABOX_PLATFORM"], "linux/arm64")

    def test_restore_database_name_is_allowed(self):
        self.values["DATABASE_NAME"] = "abox_restore_20261025120000"
        self.write()
        self.assertEqual(common.config()["DATABASE_NAME"], self.values["DATABASE_NAME"])


class AccountPreflightTests(unittest.TestCase):
    def execute(self, responses, profile="abox-free"):
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory) / "approval.json"
            argv = ["preflight.py", "--profile", profile, "--expected-account-id", "123456789012", "--output", str(output)]
            results = [subprocess.CompletedProcess([], 0, json.dumps(value), "") for value in responses]
            with mock.patch.object(sys, "argv", argv), mock.patch.object(subprocess, "run", side_effect=results) as run, contextlib.redirect_stdout(io.StringIO()):
                try:
                    preflight.main()
                    return run.call_count, json.loads(output.read_text())
                except RuntimeError as error:
                    self.assertFalse(output.exists())
                    return run.call_count, str(error)

    def test_wrong_account_stops_before_any_other_read(self):
        calls, error = self.execute([{"Account": "999999999999"}])
        self.assertEqual(calls, 1)
        self.assertIn("Identity mismatch", error)

    def test_default_profile_is_never_used(self):
        calls, error = self.execute([], profile="default")
        self.assertEqual(calls, 0)

    def test_paid_account_cannot_proceed(self):
        calls, error = self.execute([{"Account": "123456789012"}, {"accountPlanType": "PAID", "accountPlanStatus": "ACTIVE"}])
        self.assertEqual(calls, 2)
        self.assertIn("Free plan", error)

    def test_insufficient_credit_or_expiry_blocks_approval(self):
        for amount, days in [(25, 60), (100, 3)]:
            calls, error = self.execute([
                {"Account": "123456789012"},
                {"accountPlanType": "FREE", "accountPlanStatus": "ACTIVE", "accountPlanRemainingCredits": {"unit": "USD", "amount": amount}, "accountPlanExpirationDate": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=days)).isoformat()},
            ])
            self.assertEqual(calls, 2)
            self.assertIn("safety margin", error)

    def test_success_does_not_persist_account_or_credit_amount(self):
        calls, record = self.execute([
            {"Account": "123456789012"},
            {"accountPlanType": "FREE", "accountPlanStatus": "ACTIVE", "accountPlanRemainingCredits": {"unit": "USD", "amount": 100}, "accountPlanExpirationDate": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=60)).isoformat()},
            {"InstanceTypes": [{"MemoryInfo": {"SizeInMiB": 2048}, "ProcessorInfo": {"SupportedArchitectures": ["arm64"]}}]},
            {"InstanceTypeOfferings": [{"InstanceType": "t4g.small"}]},
            {"Quota": {"Value": 2}},
            {"Parameter": {"Value": "ami-synthetic"}},
        ])
        self.assertEqual(calls, 6)
        self.assertEqual(record["plan"], "FREE")
        self.assertNotIn("123456789012", json.dumps(record))
        self.assertNotIn("amount", json.dumps(record))


if __name__ == "__main__":
    unittest.main()
