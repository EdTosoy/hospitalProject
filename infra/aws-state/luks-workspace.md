# Proposed NixOS encrypted Terraform workspace

**Preparation only. Do not execute provisioning commands below without separate
approval.** No file/container was formatted, mapping opened, mount created, swap
disabled, or privileged system configuration changed during this review.

The host is NixOS 26.05. Nix/nix-shell, losetup, mkfs.ext4, mount, findmnt and
systemd-cryptsetup are present. `cryptsetup` is not on PATH; realized cryptsetup
2.8.6/2.8.7 store entries inspected contain libraries/locales, not the CLI. Nix
derivation inspection was sandbox-denied at the daemon socket. No package was
downloaded or installed. An approved ephemeral `nix-shell -p cryptsetup` is the
minimal tooling option; select/pin the installed system's nixpkgs revision before
use. Do not edit `configuration.nix` or run `nixos-rebuild` for this task.
`dm_mod` is visible, but `dm_crypt` and `/dev/mapper/control` are not visible in
the current sandbox. Host device-mapper access/kernel support must be checked by
the owner before approving container activation; no module was loaded here.

Recommend a **1 GiB regular-file LUKS2 container** outside the checkout, mounted
only during Terraform work. It avoids partition changes. Keep only Terraform
source/provider metadata/state/plans there; use the existing immutable provider
cache rather than putting application builds or Docker layers on this small volume.
The backing ext4 stores encrypted container bytes. A passphrase entered at the
cryptsetup prompt unlocks it; store recovery information independently in the
owner's password manager. Never use a key file on the unencrypted host disk.
See [NixOS encryption guidance](https://nixos.org/manual/nixos/stable/#sec-luks-file-systems)
and the [cryptsetup luksFormat manual](https://gitlab.com/cryptsetup/cryptsetup/-/blob/v2.8.7/man/cryptsetup-luksFormat.8.adoc).

## Manual creation proposal — approval required

Run in a private terminal, after approving the CLI environment and container path.
These commands target a **new regular file**, never an existing disk or partition.
The exclusive shell creation prevents reuse of an existing file. Stop if any
command fails; do not automate retries or cleanup over uncertain paths.

```sh
set -eu
umask 077
export ABOX_CRYPTSETUP="$(command -v cryptsetup)"
test -x "$ABOX_CRYPTSETUP"
export ABOX_CONTAINER="$HOME/.local/share/abox-private/terraform.luks"
export ABOX_MOUNT="$HOME/.local/share/abox-private/work"
mkdir -p "$HOME/.local/share/abox-private"
chmod 700 "$HOME/.local/share/abox-private"
test ! -e "$ABOX_CONTAINER" && test ! -L "$ABOX_CONTAINER"
(set -C; : > "$ABOX_CONTAINER")
truncate -s 1G "$ABOX_CONTAINER"
test -f "$ABOX_CONTAINER" && test ! -L "$ABOX_CONTAINER"
test ! -e /dev/mapper/abox-tf-work
sudo "$ABOX_CRYPTSETUP" luksFormat --type luks2 "$ABOX_CONTAINER"
sudo "$ABOX_CRYPTSETUP" open --type luks2 "$ABOX_CONTAINER" abox-tf-work
sudo "$ABOX_CRYPTSETUP" status abox-tf-work
# Verify the mapping's backing file is the newly approved container BEFORE mkfs.
sudo losetup --list --output NAME,BACK-FILE
sudo mkfs.ext4 /dev/mapper/abox-tf-work
mkdir -m 700 "$ABOX_MOUNT"
sudo mount -o nosuid,nodev /dev/mapper/abox-tf-work "$ABOX_MOUNT"
sudo chown "$(id -u):$(id -g)" "$ABOX_MOUNT"
chmod 700 "$ABOX_MOUNT"
```

Terraform providers are executables, so this mount permits execution while
retaining `nosuid,nodev`. Prefer the existing immutable provider cache outside
the volume to minimize space and avoid unnecessary downloads.
No fstab/crypttab entry, boot unlock, discard or automatic key management is needed.

## Independent acceptance gates

1. Confirm `cryptsetup isLuks --type luks2 "$ABOX_CONTAINER"`, inspect
   `cryptsetup status`, `findmnt -T "$ABOX_MOUNT"`, and `lsblk`/loop backing-file
   evidence. An ext4 filesystem *inside* the mapped LUKS device is expected; plain
   ext4 without the dm-crypt backing proof is insufficient.
2. Swap is currently a plain partition `/dev/nvme0n1p2`, 8 GiB. Before sensitive
   work, separately approve temporary swap disablement after assessing available
   RAM, or configure verified encrypted swap as a separate system task. Do not
   disable swap automatically. No hibernation/suspend-to-disk while unlocked.
3. Verify private ownership/permissions, no automatic sync/indexing/backups of the
   unlocked mount, core dumps disabled and Terraform debug logs off. Terminal,
   shell/editor history and scrollback must not capture plan/state values on the
   unencrypted host. Credentials remain short-lived and outside Terraform files.
4. Demonstrate a synthetic file survives close/reopen; never use real secrets to
   test. Back up the LUKS header with `cryptsetup luksHeaderBackup` to independently
   encrypted recovery storage; protect and label it with the container identity.
   Header backup, recovery passphrase and encrypted container must be recoverable
   outside this workstation. Test recovery before trusting the only state copy.
5. Set `ABOX_SECURE_WORK` to a directory inside the verified mount. Copy both roots
   there; keep cwd, `TF_DATA_DIR`, `TMPDIR`, migration backups and error state inside.
   Run tools only after verifying the expected mount is still active; an unmounted
   directory would write plaintext onto the host filesystem.

For later close/reopen: exit all shells/processes using the mount, unmount it,
then `cryptsetup close abox-tf-work`. Do not force unmount, remove a busy mapping,
or delete failed-operation state. Reopen with `cryptsetup open`, mount and repeat
the backing/encryption/swap checks before every session. Container encryption
protects at rest, not from a compromised machine while unlocked.

Until all checks independently pass, local state/plan storage stays **NO-GO**.
