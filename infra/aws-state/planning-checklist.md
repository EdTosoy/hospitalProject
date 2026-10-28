# Safe state bootstrap and EC2 planning

**Stop before provisioning.** These are prepared owner commands, not commands
executed by this task. Credit expiry/applicability checks are explicitly waived
under [ABOX-RISK-001](../../docs/aws-demo-risks.md); they are not prerequisites.
Account identity, FREE/ACTIVE, minimum $75 balance, 69-day account-plan window,
Sydney discovery, secure local files and scoped access remain safeguards.

## 1. Activate the local workspace

Complete the owner-approved [LUKS setup and reopen test](luks-workspace.md) in a
private, sleep-inhibited terminal. Keep swap disabled. Do not run Terraform from
the source checkout or plain /tmp. Set these paths in the protected shell:

```sh
set -euo pipefail
umask 077
ulimit -c 0
export ABOX_REPO=/mnt/storage/projects/hospitalProject
export ABOX_SECURE_WORK="$HOME/.local/share/abox-private/work/abox"
export ABOX_PLUGIN_DIR="$ABOX_REPO/terraform/.terraform/providers"
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK"
export TMPDIR="$ABOX_SECURE_WORK/tmp"
mkdir -m 700 "$TMPDIR" "$ABOX_SECURE_WORK/bootstrap" "$ABOX_SECURE_WORK/application"
unset TF_LOG TF_LOG_PATH TF_LOG_CORE TF_LOG_PROVIDER
cp "$ABOX_REPO"/infra/aws-state/*.tf "$ABOX_REPO/infra/aws-state/.terraform.lock.hcl" "$ABOX_SECURE_WORK/bootstrap/"
cp "$ABOX_REPO/infra/aws-state/backend_override.tf.example" "$ABOX_SECURE_WORK/bootstrap/"
cp "$ABOX_REPO"/infra/aws-demo/*.tf "$ABOX_REPO/infra/aws-demo/user-data.sh" "$ABOX_REPO/infra/aws-demo/.terraform.lock.hcl" "$ABOX_SECURE_WORK/application/"
# This existing ignored file has account/profile identifiers; inspect the copied values privately.
install -m 600 "$ABOX_REPO/infra/aws-demo/terraform.tfvars" "$ABOX_SECURE_WORK/application/demo.tfvars"
python3 "$ABOX_REPO/deploy/aws-demo/preflight.py" \
  --profile abox-747240980964 --expected-account-id 747240980964 \
  --output "$ABOX_SECURE_WORK/account-approval.json"
```

The mkdir commands deliberately fail on an existing working copy: inspect and
resume its existing backend metadata/state, never overwrite it blindly. If the
ignored source tfvars file is unavailable, prepare the example privately with the
exact account/profile, unique bucket suffix and agreed teardown date. No secret,
grant-expiry date or fictional verification assertion is required.

## 2. Bootstrap plan only — no AWS resources yet

The initial backend is local on the encrypted mount. The provider comes from the
already present cache; providers are executable code, not state. Both credentials
and state remain out of the source configuration.

```sh
export TF_DATA_DIR="$ABOX_SECURE_WORK/bootstrap/.terraform"
cd "$ABOX_SECURE_WORK/bootstrap"
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK" --require-cwd
terraform init -input=false -plugin-dir="$ABOX_PLUGIN_DIR" \
  -backend-config="path=$ABOX_SECURE_WORK/bootstrap/bootstrap.tfstate"
terraform validate
terraform plan -input=false -lock-timeout=5m -out=bootstrap.tfplan
terraform show -no-color bootstrap.tfplan
sha256sum bootstrap.tfplan
```

**Stop and review this saved plan.** Expect eight creates: one S3 bucket, public
access block, ownership controls, versioning, default encryption, bucket policy,
and two unattached IAM policies. No EC2, VPC, DNS, DynamoDB, KMS key, role/trust
change or policy attachment. Account must be 747240980964; region Sydney.
Expected backend usage allowance is $0.10/month (previously priced sample $0.0382).

## 3. Separate authorization boundary: backend creation

A new S3 backend cannot be initialized until its bucket exists. Creating that
bucket and controls **is AWS provisioning**, even though EC2 is not yet created.
The current task forbids it. Obtain explicit approval for the reviewed bootstrap
plan and execute its creation in a later authorized operation. No apply/destroy
command is executed or requested here. Do not repurpose an unrelated existing
bucket to skip this boundary.

Then confirm bucket ownership, Sydney location, AES256 default encryption,
versioning, public-access blocks and TLS/same-account policy through read-only
S3 calls with expected owner where supported. Review operator access and the
separate exact-key policies. Retain a protected offline source-state copy.

## 4. After authorized creation, separately approved migration/init

Set the **actual reviewed bootstrap output**, never an invented bucket name:

```sh
export TF_DATA_DIR="$ABOX_SECURE_WORK/bootstrap/.terraform"
cd "$ABOX_SECURE_WORK/bootstrap"
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK" --require-cwd
export ABOX_STATE_BUCKET="$(terraform output -raw state_bucket)"
printf 'bucket = "%s"\n' "$ABOX_STATE_BUCKET" > backend.hcl
chmod 600 backend.hcl
```

Only after explicit authorization to migrate bootstrap state:

```sh
cp backend_override.tf.example backend_override.tf
terraform init -migrate-state -plugin-dir="$ABOX_PLUGIN_DIR" -backend-config=backend.hcl
```

Inspect the interactive source/destination before accepting migration. Do not
use -force-copy or substitute -reconfigure for migration. Compare lineage, serial
and resource addresses in protected files after migration; verify S3 object
encryption/versioning and normal lock/unlock. Keep the override with this working
copy; removing it would revert bootstrap configuration to local state.

For a **confirmed new** application state, after owner-authorized S3 initialization:

```sh
export TF_DATA_DIR="$ABOX_SECURE_WORK/application/.terraform"
cd "$ABOX_SECURE_WORK/application"
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK" --require-cwd
printf 'bucket = "%s"\n' "$ABOX_STATE_BUCKET" > backend.hcl
chmod 600 backend.hcl
terraform init -input=false -plugin-dir="$ABOX_PLUGIN_DIR" -backend-config=backend.hcl
terraform workspace show
```

Initialization may create state/lock objects; it is not an authorized action in
this preparation task. If any local or remote application state exists, stop and
review its migration separately. Only the default workspace is supported. Keep
state/lock keys distinct: `abox/bootstrap/terraform.tfstate` and
`abox/aws-demo/terraform.tfstate`, each with its own `.tflock` object.

## 5. Real EC2 plan — review only

Once pre-plan account/balance/plan-window, Sydney access, encrypted workspace and
backend gates pass, set `free_plan_verified=true` **only in the encrypted copied
demo.tfvars**, retaining exact profile/account pins and the agreed teardown date.
This acknowledges the recorded owner credit waiver; it does not claim expiry or
applicability was verified. It does not assert post-provision live acceptance.

```sh
python3 "$ABOX_REPO/infra/aws-state/check-workspace.py" --path "$ABOX_SECURE_WORK" --require-cwd
terraform validate
terraform plan -input=false -lock-timeout=5m -var-file=demo.tfvars -out=reviewed-ec2.tfplan
terraform show -no-color reviewed-ec2.tfplan
sha256sum reviewed-ec2.tfplan
```

Stop. Do not apply. The expected source graph is **21 application resource
instances**, subject to actual plan/data-source review: one t4g.small/ARM64,
30-GiB encrypted gp3 root volume, Standard CPU credits, IMDSv2/hop limit 1,
VPC/subnet/IGW/routes, TCP 80/443-only ingress, scoped SSM/backup instance IAM,
and a separate private encrypted backup bucket with seven-day lifecycle.
The root EBS volume is nested under the instance, not an extra resource count.
Expect no deletion/replacement of unrelated resources, SSH/key pair, public DB,
RDS, ECR, NAT, load balancer, Route 53, customer KMS key or account upgrade.

Prior Sydney estimate including sample state usage: **$22.18/month gross**,
**$44.36 for two months**, before tax/extra traffic/other account usage. Preserve
the $25/month allowance, $25 credit reserve and existing $5 budget. No unearned
bonus or T4g promotion is assumed. See the [Sydney rate evidence](../../docs/aws-sydney-readiness-2026-10-28.md).
App-image publication, live SSM/HTTPS/auth/2-GiB behavior and S3 backup/restore
remain later deployment acceptance steps, not prerequisites to inspect this plan.
