# abox Phase 3B local encrypted-workspace review

**Decision: NO-GO for secure Terraform backend bootstrap or encrypted S3 backend
creation.** The file-backed design is feasible, but no container has been created
or mounted. Actual LUKS2, mount, permission, no-swap, persistence and recovery-copy
acceptance remain unverified. This review stops before privileged storage changes
and all AWS resource creation. Credit-expiry/applicability checks remain waived
under ABOX-RISK-001; they were not reopened.

The working tree was clean at `bd2f6a1` when this task began. Changes are limited
to the workspace guard/tests, LUKS procedure, planning checklist and this report.

## Read-only host evidence

Commands below were executed on 2026-10-28. Device access and the real writable
host mount were inspected outside the sandbox using approved read-only execution;
the sandbox hides device nodes and shows a read-only root filesystem view.

| Executed command / observation | Result |
| --- | --- |
| `uname -sr`; `cat /etc/os-release` | NixOS 26.05, Linux 6.18.53 |
| Python `os.getuid()` / `os.getgid()` | UID 1001, GID 100 |
| `free -m`; `df -h /home/edtosoy /tmp` | About 30 GiB available RAM; 9.1 GiB free on home filesystem; 1 GiB file is feasible at this snapshot |
| `findmnt --target /home/edtosoy --output SOURCE,TARGET,FSTYPE,OPTIONS` | Host: `/dev/nvme0n1p3`, ext4, `rw,relatime`; backing encryption not established |
| `lsblk --output NAME,TYPE,FSTYPE,SIZE,MOUNTPOINTS`; `/proc/swaps`; `swapon --show` | Active plain 8 GiB `/dev/nvme0n1p2` swap, 0 B used; no expected abox mapping |
| Python `shutil.which()` for required utilities | `cryptsetup` absent; dmsetup, losetup, mkfs.ext4, mount, modprobe/modinfo, Nix, sudo, systemd-inhibit, fallocate, findmnt, lsblk and Python present |
| `findmnt --version`; `losetup --version`; `systemd-inhibit --version` | util-linux 2.42.3; systemd 260.4 |
| `/proc/modules`; `modinfo -n dm_crypt`; `modinfo -n loop` | `dm_mod` and `loop` loaded; matching dm-crypt module exists but is not loaded |
| Host `os.path.exists` / `os.access` on `/dev/mapper/control`, `/dev/loop-control` | Nodes exist; ordinary user lacks read/write access |
| `sudo -n -l` | Exit 1: password required; permitted sudo command set not yet established |
| `systemd-inhibit --list --no-pager`; `/sys/power/resume` | Existing sleep inhibitors are delay-only; no abox block inhibitor. Resume device `0:0`; this does not authorize sleep/hibernation during sensitive work |
| Pinned Nixpkgs `pkgs/by-name/cr/cryptsetup/package.nix`, read with `rg`/Python | Version 2.8.6. Older 2.8.7 derivation reference was stale for this source. Existing cryptsetup library outputs have no `bin/cryptsetup`; no acquisition performed |
| Python path/ancestor checks | `$HOME/.local/share/abox-private` absent; inspected home ancestors are not symlinks. `/dev/mapper/abox-tf-work` absent |

No `modprobe`, `swapoff`, loop allocation, cryptsetup format/open, filesystem
format, mount/unmount or ownership changes were executed. `sudo -n -l` only
inspected authorization availability; no password was supplied or requested by a
tool. No AWS calls, Terraform backend initialization, real plans, apply/destroy,
account changes, package installations, commits or pushes occurred.

## Procedure corrections

Use the [reviewed LUKS runbook](../infra/aws-state/luks-workspace.md) for exact
owner commands and the [planning checklist](../infra/aws-state/planning-checklist.md)
for later protected Terraform paths.

- Preserve an outer sleep-inhibited shell if the fail-fast setup child exits.
  Check an actual sleep **block** inhibitor before working with sensitive data.
- Refuse an existing base/container/mapping, check canonical paths, validate the
  allocated loop's exact backing file, and format only the new file's loop and
  new dm-crypt mapping. Reopen without formatting; never modify partitions.
- Keep directory mode 0700, container/artifact mode 0600, `umask 077`, disabled
  core dumps/history/logging and inactive swap throughout sensitive work.
- The previous guard checked the encrypted root and pathname containment, but
  accepted plaintext submounts at cwd, `TMPDIR` and `TF_DATA_DIR`. A regression
  reproduced all three failures. The guard now checks their actual filesystem
  mounts, including an existing ancestor for a not-yet-created metadata directory.
  Mocked mount observations prove this decision logic, not live encryption.
- Synthetic state, plan, error-state, metadata, temporary and backup files are
  isolated under `verification` and checked across close/reopen. The unmounted
  plaintext workspace must disappear; the ciphertext container persists.
- Copy only a closed/unmounted ciphertext container to an independently verified
  encrypted recovery destination outside the checkout/container base. Verify the
  copied bytes. The full image includes header and data; a separate header backup
  alone cannot restore lost data. Recovery-location verification is still pending.
- Keep cwd, local state, plans, error-recovery state, metadata, private tfvars,
  temporary files and backups on encrypted storage. `TF_DATA_DIR` alone does not
  redirect every artifact. Remove injected CLI arguments/workspace selection;
  maintain the correct data directory consistently for each Terraform root.

## Executed offline verification

| Check | Result |
| --- | --- |
| `python3 -m unittest discover -s infra/aws-state -p 'test_*.py' -v` before changes | PASS: seven existing tests |
| Added plaintext-submount regression against the original guard | Expected FAIL: cwd, TMPDIR and TF_DATA_DIR subcases were wrongly accepted |
| Same suite after guard repair | PASS: nine tests, including unsafe mount flags/filesystem and plaintext-submount regressions; no mounts or privileged calls |
| Extract fenced `sh` blocks from both runbooks and pass each to `bash -n` | PASS: all 12 blocks after final edits. Setup commands were not executed |
| Invoke `check-workspace.py --path` on an ordinary mode-0700 temporary directory | PASS rejection: active swap blocks it; no claim that live encryption was tested |
| Invoke guard on `$HOME/.local/share/abox-private/work/abox` | PASS rejection: intended workspace unavailable |
| `git diff --check` | PASS |
| Actual LUKS2/backing-file proof, mount/ownership, swap disablement, synthetic close/reopen and protected recovery copy | NOT RUN: explicit authorization and interactive owner setup required |

The temporary-directory CLI check contained no sensitive data. No private files
were created in the Git checkout or home workspace. No Terraform configuration
changed, so schema/provider tests were not repeated for this local guard review.

## Exact remaining manual prerequisites

1. Explicit approval for the runbook's temporary tool acquisition and local
   storage operations: module activation, disabling only the observed swap,
   one new 1 GiB file/loop/mapping, LUKS2 and ext4 initialization on those new
   targets, mount/ownership changes, close/reopen and final cleanup/swap restore.
2. An owner host terminal with interactive sudo authorization and private LUKS
   passphrase entry; no credentials passed through agent tools. Verify the
   pinned tool source still exists and acquire its executable after approval.
3. An owner-verified independent encrypted recovery directory outside the Git
   checkout and container base, with at least 1 GiB free, plus independently
   retained passphrase/recovery information.
4. Recheck RAM, free disk, exact swap inventory and unused paths/devices. Obtain
   an actual block inhibitor, perform setup and synthetic acceptance, and verify
   inactive swap and private mounts/paths before storing any real artifacts.
5. Only after workspace acceptance, prepare/review the bootstrap plan in the
   encrypted working copy. S3 backend creation remains a later separately
   authorized action; this task never creates AWS resources.

## Primary documentation reviewed

- [cryptsetup 2.8.6 luksFormat](https://raw.githubusercontent.com/mbroz/cryptsetup/v2.8.6/man/cryptsetup-luksFormat.8.adoc)
  and [open](https://raw.githubusercontent.com/mbroz/cryptsetup/v2.8.6/man/cryptsetup-open.8.adoc):
  explicit LUKS2 initialization/unlock and interactive passphrases.
- [cryptsetup 2.8.6 header backups](https://raw.githubusercontent.com/mbroz/cryptsetup/v2.8.6/man/cryptsetup-luksHeaderBackup.8.adoc):
  header/keyslot backups remain sensitive after passphrase changes.
- [util-linux 2.42.3 losetup](https://raw.githubusercontent.com/util-linux/util-linux/v2.42.3/sys-utils/losetup.8.adoc)
  and [findmnt](https://raw.githubusercontent.com/util-linux/util-linux/v2.42.3/misc-utils/findmnt.8.adoc):
  backing-file isolation, delayed detach and actual per-path mount discovery.
- [systemd 260 inhibitors](https://raw.githubusercontent.com/systemd/systemd/v260/man/systemd-inhibit.xml):
  inhibitor lifetime and block/delay behavior.
- [Terraform environment reference](https://developer.hashicorp.com/terraform/cli/config/environment-variables):
  metadata location, logging and injected arguments. The published current page
  was available; version-specific 1.15 documentation fetches were unavailable.
  No Terraform API/configuration change relies on an unverified new behavior.
