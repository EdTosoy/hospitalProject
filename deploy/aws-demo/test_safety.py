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
import release
import shutil


class ReleaseFixture(unittest.TestCase):
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
            "BACKUP_BUCKET": "abox-demo-backups-747240980964-demo123",
            "EXPECTED_ACCOUNT_ID": "747240980964",
        }

    def write(self):
        (self.root / "release.env").write_text("\n".join(f"{k}={v}" for k, v in self.values.items()))


class ReleaseConfigTests(ReleaseFixture):
    def test_host_aws_forces_sydney_and_instance_role(self):
        with mock.patch.dict(os.environ, {"AWS_PROFILE": "default", "AWS_REGION": "ap-southeast-1",
                                          "AWS_ACCESS_KEY_ID": "synthetic-not-a-credential"}), \
                mock.patch.object(subprocess, "run", return_value=subprocess.CompletedProcess([], 0, "{}", "")) as run:
            common.aws(self.values, "s3api", "list-objects-v2")
        command = run.call_args.args[0]
        env = run.call_args.kwargs["env"]
        self.assertEqual(command[command.index("--region") + 1], "ap-southeast-2")
        self.assertNotIn("--profile", command)
        self.assertEqual(env["AWS_REGION"], "ap-southeast-2")
        self.assertEqual(env["AWS_CONFIG_FILE"], "/dev/null")
        self.assertEqual(env["AWS_SHARED_CREDENTIALS_FILE"], "/dev/null")
        self.assertNotIn("AWS_PROFILE", env)
        self.assertNotIn("AWS_ACCESS_KEY_ID", env)

    def test_owner_approval_requires_sydney_and_explicit_waiver(self):
        record = {
            "account_sha256": common.hashlib.sha256(self.values["EXPECTED_ACCOUNT_ID"].encode()).hexdigest(),
            "plan": "FREE", "status": "ACTIVE",
            "credit_balance_and_plan_window_verified": True,
            "credit_expiry_verification": "waived_by_owner",
            "credit_applicability_verification": "waived_by_owner",
            "credit_risk_waiver_id": common.CREDIT_RISK_WAIVER_ID,
            "valid_until": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)).isoformat(),
        }
        for region in ["ap-southeast-1", "ap-southeast-2"]:
            with mock.patch.object(pathlib.Path, "read_text", return_value=json.dumps({**record, "region": region})):
                if region == "ap-southeast-2":
                    common.owner_approval(self.values)
                else:
                    with self.assertRaisesRegex(RuntimeError, "Fresh owner"):
                        common.owner_approval(self.values)
        for field in ["credit_balance_and_plan_window_verified", "credit_expiry_verification",
                      "credit_applicability_verification", "credit_risk_waiver_id"]:
            incomplete = {**record, "region": "ap-southeast-2"}
            del incomplete[field]
            with mock.patch.object(pathlib.Path, "read_text", return_value=json.dumps(incomplete)):
                with self.assertRaisesRegex(RuntimeError, "Fresh owner"):
                    common.owner_approval(self.values)

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
    def execute(self, responses, profile="abox-747240980964", expected_account_id="747240980964"):
        with tempfile.TemporaryDirectory() as directory:
            output = pathlib.Path(directory) / "approval.json"
            argv = ["preflight.py", "--profile", profile, "--expected-account-id", expected_account_id, "--output", str(output)]
            results = [subprocess.CompletedProcess([], 0, json.dumps(value), "") for value in responses]
            with mock.patch.object(sys, "argv", argv), mock.patch.object(subprocess, "run", side_effect=results) as run, contextlib.redirect_stdout(io.StringIO()):
                try:
                    preflight.main()
                    return run.call_count, json.loads(output.read_text())
                except RuntimeError as error:
                    self.assertFalse(output.exists())
                    return run.call_count, str(error)
                finally:
                    for call in run.call_args_list:
                        command = call.args[0]
                        self.assertEqual(command[command.index("--region") + 1], "ap-southeast-2")
                        self.assertEqual(command[command.index("--profile") + 1], profile)

    def test_wrong_account_stops_before_any_other_read(self):
        calls, error = self.execute([{"Account": "999999999999"}])
        self.assertEqual(calls, 1)
        self.assertIn("Identity mismatch", error)

    def test_default_profile_is_never_used(self):
        calls, error = self.execute([], profile="default")
        self.assertEqual(calls, 0)

    def test_paid_account_cannot_proceed(self):
        calls, error = self.execute([{"Account": "747240980964"}, {"accountPlanType": "PAID", "accountPlanStatus": "ACTIVE"}])
        self.assertEqual(calls, 2)
        self.assertIn("Free plan", error)

    def test_insufficient_balance_or_account_plan_window_blocks_approval(self):
        for amount, days in [(25, 100), (74, 100), (100, 60), (100, 3), ("NaN", 100)]:
            calls, error = self.execute([
                {"Account": "747240980964"},
                {"accountPlanType": "FREE", "accountPlanStatus": "ACTIVE", "accountPlanRemainingCredits": {"unit": "USD", "amount": amount}, "accountPlanExpirationDate": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=days)).isoformat()},
            ])
            self.assertEqual(calls, 2)
            self.assertIn("safety margin", error)

    def test_success_does_not_persist_account_or_credit_amount(self):
        calls, record = self.execute([
            {"Account": "747240980964"},
            {"accountPlanType": "FREE", "accountPlanStatus": "ACTIVE", "accountPlanRemainingCredits": {"unit": "USD", "amount": 100}, "accountPlanExpirationDate": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=100)).isoformat()},
            {"InstanceTypes": [{"MemoryInfo": {"SizeInMiB": 2048}, "ProcessorInfo": {"SupportedArchitectures": ["arm64"]}}]},
            {"InstanceTypeOfferings": [{"InstanceType": "t4g.small"}]},
            {"Quota": {"Value": 2}},
            {"Parameter": {"Value": "ami-synthetic"}},
        ])
        self.assertEqual(calls, 6)
        self.assertEqual(record["plan"], "FREE")
        self.assertEqual(record["region"], "ap-southeast-2")
        self.assertNotIn("747240980964", json.dumps(record))
        self.assertNotIn("amount", json.dumps(record))
        self.assertNotIn("credit_runway_verified", record)
        self.assertTrue(record["credit_balance_and_plan_window_verified"])
        self.assertEqual(record["credit_expiry_verification"], "waived_by_owner")
        self.assertEqual(record["credit_applicability_verification"], "waived_by_owner")
        self.assertEqual(record["credit_risk_waiver_id"], "ABOX-RISK-001")

    def test_other_profile_and_account_cannot_reuse_owner_waiver(self):
        for kwargs in [{"profile": "abox-other"}, {"expected_account_id": "999999999999"}]:
            calls, error = self.execute([], **kwargs)
            self.assertEqual(calls, 0)
            self.assertIn("owner-confirmed", error)


class ReleasePathTests(ReleaseFixture):
    def setUp(self):
        super().setUp()
        self.home = self.root / "abox"
        self.bundle = self.home / "releases" / self.values["RELEASE_SHA"]
        self.bundle.mkdir(parents=True)
        self.source = pathlib.Path(__file__).resolve().parent

    def install(self, bundle, database="abox_demo"):
        bundle.mkdir(parents=True, exist_ok=True)
        for source in self.source.glob("*.py"):
            shutil.copyfile(source, bundle / source.name)
        values = {**self.values, "DATABASE_NAME": database}
        (bundle / "release.env").write_text("\n".join(f"{k}={v}" for k, v in values.items()))
        return bundle

    def activate(self, bundle):
        with mock.patch.object(release, "ROOT", bundle):
            release.activate_release()

    def inspect_entrypoints(self, expected, database="abox_demo"):
        # Exercise fresh module resolution through the real stable symlink,
        # as systemd backup and operator restore do; imports never run host ops.
        script = """
import json, pathlib, sys
sys.path.insert(0, sys.argv[1])
import common, backup, restore
print(json.dumps({'root':str(common.ROOT),'database':common.config()['DATABASE_NAME'],
                 'backup':str(pathlib.Path(backup.__file__).resolve().parent),
                 'restore':str(pathlib.Path(restore.__file__).resolve().parent)}))
"""
        result = subprocess.run([sys.executable, "-B", "-c", script, str(self.home / "current")],
                                check=True, capture_output=True, text=True, cwd="/")
        actual = json.loads(result.stdout)
        self.assertEqual(actual, {"root": str(expected), "database": database,
                                  "backup": str(expected), "restore": str(expected)})

    def test_release_matches_systemd_backup_and_restore_entrypoints(self):
        self.install(self.bundle)
        self.activate(self.bundle)
        self.assertEqual((self.home / "current").resolve(), self.bundle)
        self.assertFalse((self.home / "releases" / "current").exists())
        self.assertFalse((self.home / "current.next").is_symlink())
        unit = (self.source / "abox-backup.service").read_text()
        self.assertIn("ExecStart=/usr/bin/python3 /opt/abox/current/backup.py", unit)
        self.inspect_entrypoints(self.bundle)

    def test_upgrade_and_rollback_keep_backup_restore_on_selected_bundle(self):
        old = self.install(self.bundle)
        new = self.install(self.home / "releases" / ("2" * 40))
        for selected in [old, new, old]:
            self.activate(selected)
            self.inspect_entrypoints(selected)
        self.assertTrue(old.is_dir())
        self.assertTrue(new.is_dir())

    def test_schema_rollback_uses_candidate_database_from_selected_bundle(self):
        self.install(self.bundle)
        self.activate(self.bundle)
        candidate = "abox_restore_20261028080000"
        rollback = self.install(self.home / "releases" / "rollback-20261028", candidate)
        self.activate(rollback)
        self.inspect_entrypoints(rollback, candidate)

    def test_pending_or_dangling_link_blocks_activation_without_changing_current(self):
        self.install(self.bundle)
        self.activate(self.bundle)
        pending = self.home / "current.next"
        pending.symlink_to(self.home / "missing")
        with self.assertRaisesRegex(RuntimeError, "pending release symlink"):
            self.activate(self.bundle)
        self.assertEqual((self.home / "current").resolve(), self.bundle)
        self.assertTrue(pending.is_symlink())


if __name__ == "__main__":
    unittest.main()
