# NixOS file-backed LUKS2 workspace

**Viable with owner-authenticated setup; not activated.** The commands below are
prepared for the owner's normal host terminal, outside the agent sandbox. Tool
acquisition, module loading, swap changes, loop allocation, file formatting and
mounting require explicit owner authorization. None was performed in this review.
Only the newly allocated regular file and its loop/mapped devices may be formatted;
no existing disk, partition, filesystem or system configuration is to be modified.

## Verified host evidence

- NixOS 26.05, kernel 6.18.53; user UID 1001, GID 100.
- Outside the sandbox, `/dev/mapper/control` and `/dev/loop-control` exist but are
  not user read/write. `dm_mod` is loaded. `modinfo -n dm_crypt` finds the running
  kernel's module; `dm_crypt` is not currently loaded. This establishes support,
  not a successful encryption/mount test.
- `sudo -n -l` requires a password. The permitted sudo command set was not proven;
  the owner must authenticate interactively using `sudo -l`. Never send a password
  to the agent or put it in a command.
- `losetup`, `mkfs.ext4`, `mount`, `modprobe`, Nix, Python and `systemd-inhibit`
  exist. `cryptsetup` is absent from PATH and its bin output is not realized.
  Library outputs for 2.8.6/2.8.7 exist, but none contains `bin/cryptsetup`.
  The pinned Nixpkgs source below specifies cryptsetup **2.8.6**; the older
  reference to a 2.8.7 derivation did not describe that pinned package.
  No package was installed.
- Existing Nixpkgs source: `/nix/store/gsyv2ay8fc48l7vp1gspmk5pk65hrn5w-source`
  (26.05). Use this immutable source for the temporary shell below; stop if it
  has been garbage-collected rather than silently selecting another channel.
- Host snapshot refreshed 2026-10-28: about 30 GiB available RAM, 0 B used on an
  active 8 GiB plain swap partition `/dev/nvme0n1p2`; home filesystem has about
  9 GiB free. A 1 GiB container fits. Recheck immediately before setup.
- Host ext4 is writable and backed directly by `/dev/nvme0n1p3`; encryption is
  not established. The sandbox shows a read-only view and hides device nodes;
  use the owner terminal for activation and acceptance. `/sys/power/resume` is
  `0:0`, but this is not a substitute for blocking sleep/hibernation. Existing
  sleep inhibitors are delay-only; no abox block inhibitor is active.
- `$HOME/.local/share/abox-private` and `/dev/mapper/abox-tf-work` do not exist.
  The home-directory ancestors inspected are not symlinks.

Use a **1 GiB regular-file LUKS2 volume** outside the repository. This is simpler
than repartitioning or reconfiguring system boot encryption. Keep the existing
provider cache outside it and all state, plans, backend metadata and temporary
files inside. The running kernel/device support and disk space make it feasible;
password-authorized setup and a real close/reopen test remain unverified.
[NixOS manual](https://nixos.org/manual/nixos/stable/#sec-luks-file-systems),
[cryptsetup 2.8.6 format](https://raw.githubusercontent.com/mbroz/cryptsetup/v2.8.6/man/cryptsetup-luksFormat.8.adoc),
[cryptsetup 2.8.6 open](https://raw.githubusercontent.com/mbroz/cryptsetup/v2.8.6/man/cryptsetup-open.8.adoc).

## Manual prerequisites and approval scope

Before executing the setup, explicitly authorize this local-only scope:

1. Acquire the pinned cryptsetup executable/dependencies into the Nix store for
   a temporary shell; no NixOS, boot, fstab or crypttab configuration changes.
2. Authenticate `sudo -l` in the owner's host terminal and confirm the listed
   storage commands are permitted. Enter sudo/LUKS passwords only at local
   prompts; never send them to the agent.
3. Load `dm_crypt`, temporarily disable **only** the currently inspected
   `/dev/nvme0n1p2` swap, allocate one loop device for a newly created 1 GiB
   `$HOME/.local/share/abox-private/terraform.luks`, initialize **that new file's
   loop device only** as LUKS2, and format only its new `abox-tf-work` mapping.
4. Mount at `$HOME/.local/share/abox-private/work`, set ownership/private modes,
   run the synthetic close/reopen checks, then unmount/close/detach. Restore only
   the originally active swap after the encrypted workspace has closed.
5. Supply an independently verified encrypted recovery directory outside the
   repository and outside this container, with at least 1 GiB free. Keep the
   passphrase/recovery information independently in an owner-controlled password
   manager. The recovery location has not yet been supplied or verified.

If no such encrypted directory exists, the [passphrase-encrypted recovery-image
alternative](recovery-archive.md) proposes an age archive on the separate storage
disk. Confirm that method/destination before setup, and replace only the recovery
copy/tool-acquisition steps as described there. The owner's latest approval covers
preparing the isolated container, subject to interactive approval for privileged
operations; do not ask for that general authorization again. Recovery selection
and private host-terminal interactions remain required.

Recheck RAM/free disk/swap immediately before acting. If the swap inventory differs,
stop for review; do not substitute `swapoff -a` or alter another device. An existing
container, base directory or mapping requires a separate resume review, never a
rerun of the creation block. No privileged operation below is authorized merely
because this file contains its command.

## Owner-only setup — commands prepared, NOT executed

First approve the temporary tool acquisition and privileged local operations.
This shell pins the already identified Nixpkgs source and blocks sleep while the
working shell remains open. It does not edit NixOS configuration or boot files.

```sh
export ABOX_NIXPKGS=/nix/store/gsyv2ay8fc48l7vp1gspmk5pk65hrn5w-source
test -d "$ABOX_NIXPKGS"
nix-shell -I "nixpkgs=$ABOX_NIXPKGS" -p cryptsetup \
  --run 'systemd-inhibit --what=sleep --mode=block --why="abox encrypted Terraform work" bash --noprofile --norc'
```

Keep that **outer inhibited shell** open. Check `systemd-inhibit --list` in another
terminal for the abox sleep **block** entry before sensitive work. Privileged
clients can override inhibitors; do not force suspend/hibernate. See the
[systemd 260 inhibitor contract](https://raw.githubusercontent.com/systemd/systemd/v260/man/systemd-inhibit.xml).

Inside the outer shell, start a child shell for the fail-fast setup commands:

```sh
bash --noprofile --norc
```

If a command fails and `set -e` exits this child, the outer shell retains the
inhibitor. Leave it open while inspecting/closing any mapping; do not blindly
retry creation. Exit it only after all sensitive processes and mappings close.

In the child shell, run the following **once for a new container only**.
Do not run `luksFormat` or `mkfs` again when reopening an existing container.
Review free RAM and space before approving temporary swap disablement.

```sh
set -euo pipefail
umask 077
set +o history
unset HISTFILE TF_LOG TF_LOG_PATH TF_LOG_CORE TF_LOG_PROVIDER
ulimit -c 0
export LC_ALL=C
export ABOX_REPO=/mnt/storage/projects/hospitalProject
export ABOX_CRYPTSETUP="$(command -v cryptsetup)"
test -x "$ABOX_CRYPTSETUP"
"$ABOX_CRYPTSETUP" --version
export ABOX_BASE="$HOME/.local/share/abox-private"
export ABOX_CONTAINER="$ABOX_BASE/terraform.luks"
export ABOX_MOUNT="$ABOX_BASE/work"
export ABOX_SECURE_WORK="$ABOX_MOUNT/abox"
free -m
df -h "$HOME"
swapon --show
sudo -l
test "$(realpath -m "$ABOX_BASE")" = "$ABOX_BASE"
test ! -e "$ABOX_BASE"
test ! -L "$ABOX_BASE"
test ! -e /dev/mapper/abox-tf-work
test ! -L /dev/mapper/abox-tf-work
test "$(swapon --show --noheadings --output NAME)" = /dev/nvme0n1p2
# Owner-approved transient kernel/swap actions; no swap partition is reformatted.
sudo modprobe dm_crypt
sudo swapoff /dev/nvme0n1p2
test -z "$(swapon --show --noheadings --output NAME)"
mkdir -m 700 "$ABOX_BASE"
test "$(stat -c %u "$ABOX_BASE")" = "$(id -u)"
test ! -e "$ABOX_CONTAINER"
test ! -L "$ABOX_CONTAINER"
(set -C; : > "$ABOX_CONTAINER")
# Reserve actual disk space, not a sparse promise.
fallocate --length 1G "$ABOX_CONTAINER"
test -f "$ABOX_CONTAINER"
test "$(stat -c %a "$ABOX_CONTAINER")" = 600
mkdir -m 700 "$ABOX_MOUNT"
# Allocate a loop device for THIS newly created file; verify before formatting.
# Only one operator may allocate/reopen this container at a time.
ABOX_LOOP="$(sudo losetup --find --show --nooverlap "$ABOX_CONTAINER")"
export ABOX_LOOP
[[ "$ABOX_LOOP" =~ ^/dev/loop[0-9]+$ ]]
test -b "$ABOX_LOOP"
test "$(sudo losetup --noheadings --output BACK-FILE "$ABOX_LOOP")" = "$ABOX_CONTAINER"
sudo "$ABOX_CRYPTSETUP" luksFormat --type luks2 "$ABOX_LOOP"
sudo "$ABOX_CRYPTSETUP" isLuks --type luks2 "$ABOX_LOOP"
sudo "$ABOX_CRYPTSETUP" open --type luks2 "$ABOX_LOOP" abox-tf-work
test "$(sudo "$ABOX_CRYPTSETUP" status abox-tf-work | awk '$1 == "device:" {print $2}')" = "$ABOX_LOOP"
sudo mkfs.ext4 -L abox-tf-work /dev/mapper/abox-tf-work
sudo mount -o nosuid,nodev /dev/mapper/abox-tf-work "$ABOX_MOUNT"
sudo chown "$(id -u):$(id -g)" "$ABOX_MOUNT"
chmod 700 "$ABOX_MOUNT"
mkdir -m 700 "$ABOX_SECURE_WORK"
test "$(findmnt --noheadings --raw --mountpoint "$ABOX_MOUNT" --output TARGET)" = "$ABOX_MOUNT"
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK"
```

The passphrase is entered only at cryptsetup's prompt; use a unique strong value
and keep recovery information in an independent owner-controlled password manager.
Never write a plaintext key file to the unencrypted host. No discard, fstab,
crypttab or automatic boot unlock is needed. `nosuid,nodev` is used with executable
providers; a `noexec` volume would block providers stored there.

## Acceptance and clean close/reopen

Before storing sensitive files, write a synthetic marker on the volume, leave the
mount, unmount, close/detach, reopen **without formatting**, and check the marker.
Use these close commands only after every process using the volume has exited:

```sh
printf 'synthetic workspace test\n' > "$ABOX_SECURE_WORK/synthetic-marker"
export ABOX_PROBE_DIR="$ABOX_SECURE_WORK/verification"
mkdir -m 700 "$ABOX_PROBE_DIR" "$ABOX_PROBE_DIR/tmp" "$ABOX_PROBE_DIR/.terraform" "$ABOX_PROBE_DIR/backups"
for artifact in terraform.tfstate reviewed.tfplan errored.tfstate backups/terraform.tfstate.backup .terraform/backend-metadata tmp/temporary; do
  printf 'synthetic workspace test\n' > "$ABOX_PROBE_DIR/$artifact"
  test "$(stat -c %a "$ABOX_PROBE_DIR/$artifact")" = 600
done
(
  cd "$ABOX_PROBE_DIR"
  TMPDIR="$ABOX_PROBE_DIR/tmp" TF_DATA_DIR="$ABOX_PROBE_DIR/.terraform" \
    python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK" --require-cwd
  sha256sum terraform.tfstate reviewed.tfplan errored.tfstate backups/terraform.tfstate.backup .terraform/backend-metadata tmp/temporary > checksums
)
sync
cd "$HOME"
sudo umount "$ABOX_MOUNT"
sudo "$ABOX_CRYPTSETUP" close abox-tf-work
sudo losetup --detach "$ABOX_LOOP"
udevadm settle
test -z "$(sudo losetup --noheadings --associated "$ABOX_CONTAINER" --output NAME)"
test ! -e /dev/mapper/abox-tf-work
test ! -d "$ABOX_SECURE_WORK"
if findmnt --noheadings --mountpoint "$ABOX_MOUNT"; then exit 1; fi
```

The closed container persists on disk as ciphertext; the plaintext workspace must
disappear when unmounted. It is not an ephemeral directory. Synthetic files above
are deliberately isolated under `verification`, not usable Terraform state/plans.
Before relying on the workspace, make a **closed/unmounted** ciphertext copy to
the owner-verified independent encrypted recovery destination:

```sh
: "${ABOX_RECOVERY_DIR:?Set the independently verified encrypted recovery directory}"
export ABOX_RECOVERY_DIR
test -d "$ABOX_RECOVERY_DIR"
test "$(realpath "$ABOX_RECOVERY_DIR")" = "$ABOX_RECOVERY_DIR"
test "$(stat -c %u "$ABOX_RECOVERY_DIR")" = "$(id -u)"
test "$(stat -c %a "$ABOX_RECOVERY_DIR")" = 700
python3 - <<'PY'
import os, pathlib
destination = pathlib.Path(os.environ["ABOX_RECOVERY_DIR"]).resolve(strict=True)
for name in ["ABOX_REPO", "ABOX_BASE"]:
    if destination.is_relative_to(pathlib.Path(os.environ[name]).resolve()):
        raise SystemExit("Recovery destination must be outside the checkout and container base")
PY
export ABOX_RECOVERY_COPY="$ABOX_RECOVERY_DIR/abox-terraform.luks.snapshot"
test ! -e "$ABOX_RECOVERY_COPY"
test ! -L "$ABOX_RECOVERY_COPY"
(set -C; cat "$ABOX_CONTAINER" > "$ABOX_RECOVERY_COPY")
chmod 600 "$ABOX_RECOVERY_COPY"
cmp --silent "$ABOX_CONTAINER" "$ABOX_RECOVERY_COPY"
```

The destination's encryption, independence, free space and exclusion from the Git
checkout must be verified by the owner before this block; the path/mode checks
alone do not prove them. The full copy includes the LUKS header and encrypted
data; a header-only backup cannot recover lost data. If separately exporting a
header, keep it equally protected: an old header and its valid old passphrase can
still decrypt the data after a passphrase change. See the
[cryptsetup 2.8.6 header-backup contract](https://raw.githubusercontent.com/mbroz/cryptsetup/v2.8.6/man/cryptsetup-luksHeaderBackup.8.adoc).
Do not back up `/dev/mapper/abox-tf-work` to plaintext storage. Keep recovery copies
current after future state changes; do not copy a live mounted container.
The [util-linux 2.42.3 loop-device contract](https://raw.githubusercontent.com/util-linux/util-linux/v2.42.3/sys-utils/losetup.8.adoc)
explains `--nooverlap`, single-operator allocation and delayed detachment; the
close block waits for device events and confirms no loop still references the file.

Then reopen the original container and verify persistence:

```sh
# Reopen the same regular file. NO luksFormat/mkfs on this path.
ABOX_LOOP="$(sudo losetup --find --show --nooverlap "$ABOX_CONTAINER")"
export ABOX_LOOP
[[ "$ABOX_LOOP" =~ ^/dev/loop[0-9]+$ ]]
test -b "$ABOX_LOOP"
test "$(sudo losetup --noheadings --output BACK-FILE "$ABOX_LOOP")" = "$ABOX_CONTAINER"
sudo "$ABOX_CRYPTSETUP" isLuks --type luks2 "$ABOX_LOOP"
sudo "$ABOX_CRYPTSETUP" open --type luks2 "$ABOX_LOOP" abox-tf-work
test "$(sudo "$ABOX_CRYPTSETUP" status abox-tf-work | awk '$1 == "device:" {print $2}')" = "$ABOX_LOOP"
sudo mount -o nosuid,nodev /dev/mapper/abox-tf-work "$ABOX_MOUNT"
test "$(findmnt --noheadings --raw --mountpoint "$ABOX_MOUNT" --output TARGET)" = "$ABOX_MOUNT"
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK"
grep -Fx 'synthetic workspace test' "$ABOX_SECURE_WORK/synthetic-marker"
(
  cd "$ABOX_PROBE_DIR"
  sha256sum --check checksums
  TMPDIR="$ABOX_PROBE_DIR/tmp" TF_DATA_DIR="$ABOX_PROBE_DIR/.terraform" \
    python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK" --require-cwd
)
```

Keep swap disabled and the sleep inhibitor open throughout sensitive work. Run
`check-workspace.py --require-cwd` before every Terraform operation as described in
[the planning checklist](planning-checklist.md). It rejects active swap, a plain
unmounted fallback, loose permissions, the wrong mapping, cwd/temp paths outside
this volume and plaintext submounts at cwd, `TMPDIR` or `TF_DATA_DIR`. A path name
below the mount is insufficient: every sensitive directory must use that actual
encrypted filesystem. It is a read-only guard, not a substitute for the owner LUKS2 and
backing-file checks above. Terminal/editor backups and scrollback must not persist
plan/state content to the unencrypted host; use this private non-recorded session.

Back up the container/LUKS header and unlock recovery information to independently
protected storage before relying on the sole bootstrap state copy. Do not dump
volume keys or log cryptsetup debugging. After work, stop Terraform/editors,
unmount, close and detach as above; only then restore the initially active swap
with `sudo swapon /dev/nvme0n1p2`, exit the child, and exit the outer inhibited
shell. Do not force a busy unmount or discard `errored.tfstate`. If any command fails, stop and inspect; do
not rerun the creation block against an existing file or mapping.

**State-storage status remains NO-GO until this actual activation and verification
succeeds. Credit expiry/applicability verification is owner-waived and is not part
of this workspace gate.**
