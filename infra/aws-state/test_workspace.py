"""Offline fail-closed checks; no mounts, loop allocation or privileged calls."""
import importlib.util
import json
import os
import pathlib
import subprocess
import tempfile
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location("workspace", pathlib.Path(__file__).with_name("check-workspace.py"))
workspace = importlib.util.module_from_spec(spec)
spec.loader.exec_module(workspace)


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = pathlib.Path(self.temp.name)
        self.path.chmod(0o700)
        self.mapping = self.path / "mock-mapping"
        self.mapping.touch()
        self.patch = mock.patch.object(workspace, "MAPPING", self.mapping)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def check(self, *, swap=False, encrypted=True, kind="crypt", require_cwd=False):
        mount = {"source": str(self.mapping if encrypted else self.path / "plain"),
                 "target": str(self.path), "fstype": "ext4", "options": "rw,nosuid,nodev"}
        (self.path / "plain").touch()
        with mock.patch.object(pathlib.Path, "read_text", return_value="Filename Type Size Used Priority\n" + ("/dev/plain partition 100 0 -2\n" if swap else "")), \
                mock.patch.object(subprocess, "check_output", side_effect=[json.dumps({"filesystems": [mount]}), kind]):
            return workspace.verify(self.path, require_cwd)

    def test_accepts_expected_private_crypt_mount_without_swap(self):
        self.assertEqual(self.check(), self.path)

    def test_rejects_active_swap(self):
        with self.assertRaisesRegex(RuntimeError, "Swap is active"):
            self.check(swap=True)

    def test_rejects_unmounted_plaintext_fallback(self):
        with self.assertRaisesRegex(RuntimeError, "no plaintext fallback"):
            self.check(encrypted=False)

    def test_rejects_noncrypt_mapping(self):
        with self.assertRaisesRegex(RuntimeError, "not a dm-crypt"):
            self.check(kind="loop")

    def test_rejects_loose_permissions(self):
        self.path.chmod(0o755)
        with self.assertRaisesRegex(RuntimeError, "mode 0700"):
            self.check()

    def test_operations_require_encrypted_cwd_and_temporary_paths(self):
        with mock.patch.object(pathlib.Path, "cwd", return_value=self.path), \
                mock.patch.dict(os.environ, {"TMPDIR": str(self.path / "tmp"), "TF_DATA_DIR": str(self.path / "data")}):
            self.check(require_cwd=True)
            with mock.patch.dict(os.environ, {"TMPDIR": "/tmp"}):
                with self.assertRaisesRegex(RuntimeError, "TMPDIR"):
                    self.check(require_cwd=True)

    def test_rejects_checkout_directory(self):
        with self.assertRaisesRegex(RuntimeError, "outside the repository"):
            workspace.verify(workspace.REPO)


if __name__ == "__main__":
    unittest.main()
