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

    def check(self, *, swap=False, encrypted=True, kind="crypt", require_cwd=False,
              plaintext_paths=(), options="rw,nosuid,nodev", fstype="ext4"):
        (self.path / "plain").touch()

        def output(command, **kwargs):
            if command[0] == "lsblk":
                return kind
            target = pathlib.Path(command[command.index("--target") + 1])
            protected = encrypted and target not in plaintext_paths
            mount = {"source": str(self.mapping if protected else self.path / "plain"),
                     "target": str(self.path), "fstype": fstype, "options": options}
            return json.dumps({"filesystems": [mount]})

        with mock.patch.object(pathlib.Path, "read_text", return_value="Filename Type Size Used Priority\n" + ("/dev/plain partition 100 0 -2\n" if swap else "")), \
                mock.patch.object(subprocess, "check_output", side_effect=output):
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

    def test_rejects_unsafe_mount_flags_or_filesystem(self):
        for options in ["ro,nosuid,nodev", "rw,nodev", "rw,nosuid"]:
            with self.subTest(options=options), self.assertRaisesRegex(RuntimeError, "ext4 with nosuid,nodev"):
                self.check(options=options)
        with self.assertRaisesRegex(RuntimeError, "ext4 with nosuid,nodev"):
            self.check(fstype="tmpfs")

    def test_operations_require_encrypted_cwd_and_temporary_paths(self):
        with mock.patch.object(pathlib.Path, "cwd", return_value=self.path), \
                mock.patch.dict(os.environ, {"TMPDIR": str(self.path / "tmp"), "TF_DATA_DIR": str(self.path / "data")}):
            self.check(require_cwd=True)
            with mock.patch.dict(os.environ, {"TMPDIR": "/tmp"}):
                with self.assertRaisesRegex(RuntimeError, "TMPDIR"):
                    self.check(require_cwd=True)

    def test_rejects_plaintext_submounts_in_sensitive_directories(self):
        paths = {name: self.path / name for name in ["cwd", "TMPDIR", "TF_DATA_DIR"]}
        for path in paths.values():
            path.mkdir(mode=0o700)
        for name, path in paths.items():
            with self.subTest(directory=name), \
                    mock.patch.object(pathlib.Path, "cwd", return_value=paths["cwd"]), \
                    mock.patch.dict(os.environ, {key: str(paths[key]) for key in ["TMPDIR", "TF_DATA_DIR"]}):
                with self.assertRaisesRegex(RuntimeError, "no plaintext fallback"):
                    self.check(require_cwd=True, plaintext_paths={path})

    def test_rejects_checkout_directory(self):
        with self.assertRaisesRegex(RuntimeError, "outside the repository"):
            workspace.verify(workspace.REPO)


if __name__ == "__main__":
    unittest.main()
