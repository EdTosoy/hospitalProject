#!/usr/bin/env python3
"""Read-only guard for the owner-activated abox encrypted work volume."""
import argparse
import json
import os
import pathlib
import subprocess

REPO = pathlib.Path(__file__).resolve().parents[2]
MAPPING = pathlib.Path("/dev/mapper/abox-tf-work")


def verify_mount(path):
    # TF_DATA_DIR may not exist until init. Verify its nearest existing ancestor.
    while not path.exists():
        path = path.parent
    raw = subprocess.check_output([
        "findmnt", "--json", "--target", str(path), "--output", "SOURCE,TARGET,FSTYPE,OPTIONS",
    ], text=True)
    mount = json.loads(raw)["filesystems"][0]
    if pathlib.Path(mount["source"]).resolve(strict=True) != MAPPING.resolve(strict=True):
        raise RuntimeError("Expected abox encrypted mapping is not mounted; no plaintext fallback")
    if mount["fstype"] != "ext4" or not {"rw", "nosuid", "nodev"} <= set(mount["options"].split(",")):
        raise RuntimeError("Expected writable ext4 with nosuid,nodev")
    if not path.is_relative_to(pathlib.Path(mount["target"]).resolve()):
        raise RuntimeError("Workspace is outside the encrypted mount")


def verify(path, require_cwd=False):
    if not path.is_absolute() or path.is_symlink():
        raise RuntimeError("Use an absolute, non-symlink workspace directory")
    path = path.resolve(strict=True)
    if path.is_relative_to(REPO) or not path.is_dir():
        raise RuntimeError("Workspace must be a directory outside the repository")
    info = path.stat()
    if info.st_uid != os.geteuid() or info.st_mode & 0o777 != 0o700:
        raise RuntimeError("Workspace must be owned by the current user with mode 0700")
    if len(pathlib.Path("/proc/swaps").read_text().splitlines()) > 1:
        raise RuntimeError("Swap is active; owner-approved swap protection is required")
    verify_mount(path)
    kind = subprocess.check_output([
        "lsblk", "--nodeps", "--noheadings", "--output", "TYPE", str(MAPPING),
    ], text=True).strip()
    if kind != "crypt":
        raise RuntimeError("Mapping is not a dm-crypt device")
    if require_cwd:
        cwd = pathlib.Path.cwd().resolve()
        if not cwd.is_relative_to(path):
            raise RuntimeError("Terraform current directory must be inside the encrypted workspace")
        verify_mount(cwd)
        for key in ["TMPDIR", "TF_DATA_DIR"]:
            value = os.environ.get(key)
            if not value or not pathlib.Path(value).is_absolute() or not pathlib.Path(value).resolve().is_relative_to(path):
                raise RuntimeError(f"{key} must point inside the encrypted workspace")
            verify_mount(pathlib.Path(value).resolve())
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--path", type=pathlib.Path, required=True)
    parser.add_argument("--require-cwd", action="store_true")
    args = parser.parse_args()
    verify(args.path, args.require_cwd)
    print("PASS: private workspace on expected dm-crypt mount, swap disabled; no storage changes made.")
    print("Owner LUKS2/backing-file and recovery verification remain required; this guard does not unlock or format storage.")


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, KeyError, ValueError, subprocess.CalledProcessError) as error:
        raise SystemExit(str(error) if isinstance(error, RuntimeError) else "Workspace cannot be verified; no sensitive operation authorized")
