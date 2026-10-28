# Independent passphrase-encrypted recovery image

This is the proposed fallback when no independent encrypted directory exists.
It replaces the encrypted-destination prerequisite only after the owner chooses
and approves the destination and temporary `age` acquisition. It does not approve
privileged operations, AWS access or Terraform execution.

Host inspection found the container's home filesystem on `/dev/nvme0n1p3` and
a separate writable `/mnt/storage` filesystem on `/dev/sda1`, with about 291 GiB
free. The proposed archive is `/mnt/storage/abox-recovery/terraform.luks.age`.
This is independent of the source disk and outside the checkout. It is not an
off-machine backup and does not protect against loss of the entire machine.
No directory or archive has yet been created.

Use `age --passphrase` from the same pinned temporary Nix shell as cryptsetup.
The pinned source specifies age 1.3.2 and cryptsetup 2.8.6. The additional tool is
needed only for this requested archive option; no system configuration is changed.
`age` obtains passphrases from the terminal, not command arguments or a plaintext
key file. See the [age 1.3.2 manual](https://raw.githubusercontent.com/FiloSottile/age/v1.3.2/doc/age.1.ronn).

Before any actual setup, confirm the proposed recovery method/location with the
owner. If a suitable encrypted directory is supplied instead, retain the original
closed-image copy procedure and do not acquire age unnecessarily.

## Owner-terminal commands, after approval only

The temporary shell command becomes:

```sh
export ABOX_NIXPKGS=/nix/store/gsyv2ay8fc48l7vp1gspmk5pk65hrn5w-source
test -d "$ABOX_NIXPKGS"
nix-shell -I "nixpkgs=$ABOX_NIXPKGS" -p cryptsetup age \
  --run 'systemd-inhibit --what=sleep --mode=block --why="abox encrypted Terraform work" bash --noprofile --norc'
```

Use the [LUKS runbook](luks-workspace.md) for creation and close/reopen acceptance.
The owner must approve privileged operations interactively and enter sudo/LUKS
passwords privately. Before the archive's passphrase prompt, swap must already be
disabled and the block inhibitor retained. Enter a strong archive passphrase,
preferably distinct from the LUKS passphrase, and retain both independently in the
owner's password manager. Neither passphrase is provided to the agent.

After clean unmount, mapping closure and loop detachment, replace the runbook's
raw recovery-copy block with the following. The source is the **closed LUKS image**,
never the decrypted mapper device. Reinspect source/destination devices and stop
if they differ from the approved snapshot. File creation below is exclusive;
existing files are never overwritten.

```sh
test -z "$(swapon --show --noheadings --output NAME)"
test -f "$ABOX_CONTAINER"
test ! -L "$ABOX_CONTAINER"
test ! -e /dev/mapper/abox-tf-work
test ! -d "$ABOX_SECURE_WORK"
test -z "$(sudo losetup --noheadings --associated "$ABOX_CONTAINER" --output NAME)"
test "$(findmnt --noheadings --raw --target "$HOME" --output SOURCE)" = /dev/nvme0n1p3
test "$(findmnt --noheadings --raw --mountpoint /mnt/storage --output SOURCE)" = /dev/sda1
test "$(realpath /mnt/storage)" = /mnt/storage
export ABOX_RECOVERY_DIR=/mnt/storage/abox-recovery
test ! -e "$ABOX_RECOVERY_DIR"
test ! -L "$ABOX_RECOVERY_DIR"
mkdir -m 700 "$ABOX_RECOVERY_DIR"
test "$(stat -c %u "$ABOX_RECOVERY_DIR")" = "$(id -u)"
test "$(stat -c %a "$ABOX_RECOVERY_DIR")" = 700
export ABOX_RECOVERY_ARCHIVE="$ABOX_RECOVERY_DIR/terraform.luks.age"
test ! -e "$ABOX_RECOVERY_ARCHIVE"
test ! -L "$ABOX_RECOVERY_ARCHIVE"
# umask 077 and pipefail must remain active from the owner setup shell.
unset AGE_PASSPHRASE
(set -C; age --passphrase "$ABOX_CONTAINER" > "$ABOX_RECOVERY_ARCHIVE")
test "$(stat -c %a "$ABOX_RECOVERY_ARCHIVE")" = 600
# Reenter the archive passphrase privately. No recovered image is written to disk.
age --decrypt "$ABOX_RECOVERY_ARCHIVE" | cmp --silent - "$ABOX_CONTAINER"
```

If encryption or comparison fails, stop and retain the newly created file as an
unverified artifact for inspection; do not overwrite it or claim it is recoverable.
The archive comparison must finish successfully under `set -o pipefail`, which
also checks that age authenticated the complete stream. Continue with reopening
the original image and verifying the synthetic artifact checksums. Close/clean up
again before restoring the originally active swap. No real Terraform data is used
in these acceptance checks.

The recovery archive contains the entire LUKS header/keyslots and encrypted data.
It requires the archive passphrase **and** the original LUKS passphrase to recover
the workspace. Preserve current snapshots after future state changes, using new
filenames and the same closed-image rule. A successful archive decrypt/byte check
establishes recovery-image equivalence; actual disaster recovery to a replacement
container is a separate operation, never an automatic overwrite of the original.
