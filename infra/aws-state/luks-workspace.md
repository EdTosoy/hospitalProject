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
  Its existing derivation identifies cryptsetup 2.8.7. No package was installed.
- Existing Nixpkgs source: `/nix/store/gsyv2ay8fc48l7vp1gspmk5pk65hrn5w-source`
  (26.05). Use this immutable source for the temporary shell below; stop if it
  has been garbage-collected rather than silently selecting another channel.
- Host snapshot: about 26 GiB available RAM, approximately 988 KiB used on an
  active 8 GiB plain swap partition `/dev/nvme0n1p2`; home filesystem has about
  9 GiB free. A 1 GiB container fits. Recheck immediately before setup.

Use a **1 GiB regular-file LUKS2 volume** outside the repository. This is simpler
than repartitioning or reconfiguring system boot encryption. Keep the existing
provider cache outside it and all state, plans, backend metadata and temporary
files inside. The running kernel/device support and disk space make it feasible;
password-authorized setup and a real close/reopen test remain unverified.
[NixOS manual](https://nixos.org/manual/nixos/stable/#sec-luks-file-systems),
[cryptsetup format](https://gitlab.com/cryptsetup/cryptsetup/-/blob/v2.8.7/man/cryptsetup-luksFormat.8.adoc),
[cryptsetup open](https://gitlab.com/cryptsetup/cryptsetup/-/blob/v2.8.7/man/cryptsetup-open.8.adoc).

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

In that owner terminal, run the following **once for a new container only**.
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
export ABOX_BASE="$HOME/.local/share/abox-private"
export ABOX_CONTAINER="$ABOX_BASE/terraform.luks"
export ABOX_MOUNT="$ABOX_BASE/work"
export ABOX_SECURE_WORK="$ABOX_MOUNT/abox"
free -m
df -h "$HOME"
swapon --show
sudo -l
# Owner-approved transient kernel/swap actions; no swap partition is reformatted.
sudo modprobe dm_crypt
sudo swapoff /dev/nvme0n1p2
test -z "$(swapon --show --noheadings --output NAME)"
test ! -L "$ABOX_BASE"
mkdir -p "$ABOX_BASE"
chmod 700 "$ABOX_BASE"
test "$(stat -c %u "$ABOX_BASE")" = "$(id -u)"
test ! -e "$ABOX_CONTAINER"
test ! -L "$ABOX_CONTAINER"
(set -C; : > "$ABOX_CONTAINER")
# Reserve actual disk space, not a sparse promise.
fallocate --length 1G "$ABOX_CONTAINER"
test -f "$ABOX_CONTAINER"
test ! -e /dev/mapper/abox-tf-work
# Allocate a loop device for THIS newly created file; verify before formatting.
export ABOX_LOOP="$(sudo losetup --find --show --nooverlap "$ABOX_CONTAINER")"
case "$ABOX_LOOP" in /dev/loop[0-9]*) ;; *) exit 1 ;; esac
test "$(sudo losetup --noheadings --output BACK-FILE "$ABOX_LOOP")" = "$ABOX_CONTAINER"
sudo "$ABOX_CRYPTSETUP" luksFormat --type luks2 "$ABOX_LOOP"
sudo "$ABOX_CRYPTSETUP" isLuks --type luks2 "$ABOX_LOOP"
sudo "$ABOX_CRYPTSETUP" open --type luks2 "$ABOX_LOOP" abox-tf-work
test "$(sudo "$ABOX_CRYPTSETUP" status abox-tf-work | awk '$1 == "device:" {print $2}')" = "$ABOX_LOOP"
sudo mkfs.ext4 -L abox-tf-work /dev/mapper/abox-tf-work
mkdir -m 700 "$ABOX_MOUNT"
sudo mount -o nosuid,nodev /dev/mapper/abox-tf-work "$ABOX_MOUNT"
sudo chown "$(id -u):$(id -g)" "$ABOX_MOUNT"
chmod 700 "$ABOX_MOUNT"
mkdir -m 700 "$ABOX_SECURE_WORK"
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
sync
cd "$HOME"
sudo umount "$ABOX_MOUNT"
sudo "$ABOX_CRYPTSETUP" close abox-tf-work
sudo losetup --detach "$ABOX_LOOP"
# Reopen the same regular file. NO luksFormat/mkfs on this path.
export ABOX_LOOP="$(sudo losetup --find --show --nooverlap "$ABOX_CONTAINER")"
test "$(sudo losetup --noheadings --output BACK-FILE "$ABOX_LOOP")" = "$ABOX_CONTAINER"
sudo "$ABOX_CRYPTSETUP" isLuks --type luks2 "$ABOX_LOOP"
sudo "$ABOX_CRYPTSETUP" open --type luks2 "$ABOX_LOOP" abox-tf-work
sudo mount -o nosuid,nodev /dev/mapper/abox-tf-work "$ABOX_MOUNT"
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK"
grep -Fx 'synthetic workspace test' "$ABOX_SECURE_WORK/synthetic-marker"
```

Keep swap disabled and the sleep inhibitor open throughout sensitive work. Run
`check-workspace.py --require-cwd` before every Terraform operation as described in
[the planning checklist](planning-checklist.md). It rejects active swap, a plain
unmounted fallback, loose permissions, the wrong mapping, and cwd/temp paths outside
this volume. It is a read-only guard, not a substitute for the owner LUKS2 and
backing-file checks above. Terminal/editor backups and scrollback must not persist
plan/state content to the unencrypted host; use this private non-recorded session.

Back up the container/LUKS header and unlock recovery information to independently
protected storage before relying on the sole bootstrap state copy. Do not dump
volume keys or log cryptsetup debugging. After work, stop Terraform/editors,
unmount, close and detach as above; only then restore the initially active swap
with `sudo swapon /dev/nvme0n1p2` and exit the inhibited shell. Do not force a busy
unmount or discard `errored.tfstate`. If any command fails, stop and inspect; do
not rerun the creation block against an existing file or mapping.

**State-storage status remains NO-GO until this actual activation and verification
succeeds. Credit expiry/applicability verification is owner-waived and is not part
of this workspace gate.**
