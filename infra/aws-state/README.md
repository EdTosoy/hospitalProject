# abox Terraform state preparation

**NO-GO remains in force.** Local ext4 encryption is unverified. No bucket,
policy, backend initialization against S3, state migration or real AWS plan was
performed. Sydney is now the owner-confirmed assigned region. Local schema
validation and mocked tests do not prove AWS permissions or locking operation.

The [Sydney readiness review](../../docs/aws-sydney-readiness-2026-10-28.md)
supersedes the earlier Singapore region restriction. Sydney EC2, S3 and SSM
read-only checks now pass; bucket creation, policy attachment and migration remain
separately gated. Keep both the state bucket and EC2 in the assigned Sydney region.

**Current owner decision:** individual credit-expiry and service-specific credit
applicability verification are waived under [ABOX-RISK-001](../../docs/aws-demo-risks.md).
They are not verified and no longer block planning or deployment. Fresh identity,
FREE/ACTIVE, minimum balance/account-plan window, Sydney service access and
verified encrypted storage remain required. Follow the [guarded planning checklist](planning-checklist.md)
for the complete sequence and the [LUKS setup procedure](luks-workspace.md) for
owner-only local activation. No provisioning or migration is authorized here.

## Design

Use Terraform throughout. This separate bootstrap root creates one dedicated S3
bucket, its privacy/encryption/versioning controls, a TLS-only bucket policy, and
two **unattached** backend IAM policies. There is no CloudFormation dependency,
DynamoDB lock table, KMS key, EC2 change, DNS change, or account-plan change.
The application backup bucket is independent and must never serve as state storage.

The bootstrap root initially uses a local backend **inside a verified encrypted
external workspace**. After creation, bucket verification and a separate explicit
migration approval, its state can move into the same bucket. Bootstrap Terraform
continues managing the bucket there; preserve this root independently of the
application and retain encrypted offline recovery material. The bucket, versioning
and bucket policy have `prevent_destroy`; the bucket also has `force_destroy=false`.
These protections do not prevent a privileged AWS administrator from bypassing
Terraform or editing its configuration.

| Root | State object | Lock object |
| --- | --- | --- |
| Application | `abox/aws-demo/terraform.tfstate` | same key + `.tflock` |
| Bootstrap | `abox/bootstrap/terraform.tfstate` | same key + `.tflock` |

Account **747240980964**, region **ap-southeast-2**, and profile
`abox-747240980964` are pinned. Both S3 backend configurations enforce the account
independently of the AWS provider. Bucket names are generated with an
account-specific prefix. The backend has `encrypt=true`, no KMS key, and
`use_lockfile=true`. Terraform >=1.10 is required; validation used 1.15.3 and
the existing cached AWS provider 6.56.0. Terraform's
[S3 backend documentation](https://developer.hashicorp.com/terraform/language/backend/s3)
describes locking and the distinct state/lock permissions.

Bucket defaults explicitly use SSE-S3 AES256, versioning, BucketOwnerEnforced
ownership and all four public access blocks. Policy denies HTTP, foreign-account
principals, and PUT requests without explicit AES256. Terraform 1.15.3's
[S3 client implementation](https://github.com/hashicorp/terraform/blob/v1.15.3/internal/backend/remote-state/s3/client.go)
sends the encryption setting for both state and lock writes. Native lock creation
uses a conditional write; only the lock may be deleted. Versioning retains state
history and previous lock versions/delete markers. There is deliberately no
expiration rule and no Object Lock retention on live lockfiles. Storage grows
with activity; review historical storage before approving a retention policy.

Each client policy can list only its state/lock prefixes, read/write its exact
state key, and read/write/delete its exact lock key. Neither grants state deletion,
version reads/deletion, bucket administration, other-root access or role assumption.
Only the default workspace is supported. Do not use `-lock=false`, `workspace new`
or `force-unlock` to resolve permission/concurrency problems.

Terraform 1.15.3 attempts a workspace-prefix list during initialization; its
[default-workspace fallback](https://github.com/hashicorp/terraform/blob/v1.15.3/internal/backend/remote-state/s3/backend_state.go)
handles `AccessDenied` for the default `env:` workspace prefix. Keep that default
prefix and the narrow state/lock listing policy; do not widen bucket-wide access
to suppress workspace discovery warnings. This behavior was source-reviewed,
not tested against a real bucket. Recheck it when upgrading Terraform.

Role selection/trust and policy attachment require a later review and explicit
approval. Never attach state access to the application's EC2 role. Attaching a
narrow policy to `AccountFullAccessRole` does **not** remove its broader permissions;
use a dedicated scoped operator identity for effective least privilege. Application
deployment permissions are separate from backend access; the bootstrap maintainer
also needs reviewed bucket/IAM administration permissions. Recovery/version listing
belongs to a separate administrator, not the normal state client. No identity,
trust policy, permission boundary or policy attachment is created here.

SSE-S3 protects server storage, not an authorized download or account compromise.
Keep an independently encrypted offline recovery copy before Free-plan expiry.
Recommend S3 access logging and CloudTrail data events to an independent protected
destination, plus CloudWatch monitoring. They are not enabled by this preparation:
logging/metrics choices and costs need separate review. Default storage metrics
and existing $5 budget should remain available; no budget is modified.

## Local plans, state and temporary files

S3 does not solve local plan exposure. Saved plans can contain sensitive values
even when Terraform hides them on screen. Backend metadata, migration copies,
`errored.tfstate`, `.backup` files, exports, logs and core dumps also need protection.
See [Terraform plan handling](https://developer.hashicorp.com/terraform/cli/commands/plan).

Before any real bootstrap plan/apply or migration, provide an existing encrypted
external volume (for example LUKS2), verify its backing encryption, and keep its
unlock/recovery key outside the repository. The currently visible ext4 disks do
not satisfy this gate. Creating/formatting a volume is a separate authorized task.
The [NixOS LUKS workspace proposal](luks-workspace.md) inventories the available
tools and prepares a regular-file container procedure without changing partitions.

Run Terraform from a complete working copy **on that volume**, with its current
directory, `TF_DATA_DIR`, `TMPDIR`, plans and exported state all inside it. Permissions
0700 for directories, `umask 077`, no shared desktop/session and no automatic cloud
sync. Verify encrypted swap or disable swap before sensitive operations; also
disable hibernation and core dumps. This machine currently has active swap and a
read-only `/dev/shm`; a tmpfs workaround is not an approved solution. An encrypted
filesystem alone cannot protect secrets paged into unencrypted swap.

Keep debug logging off; never use `set -x`, log JSON plans, pipe state to terminal,
or upload plans as CI artifacts. No credential/backend secret goes in HCL. Use the
existing short-lived login session. Plan review stays in the protected session;
terminal scrollback, screen recordings and editor backups must not persist on
unencrypted storage. If an artifact must leave the volume, encrypt it to a verified
recipient before export; neither a password in argv nor an unencrypted intermediate
is acceptable. Keep the plan hash and matching source revision for later review.

After an upload failure, retain `errored.tfstate` on the encrypted volume and stop.
Do not auto-delete recovery state or blindly retry an apply. An administrator must
compare lineage/serial with S3 before authorizing recovery. After accepted migration,
retain an encrypted recovery copy; remove redundant plaintext copies only under
the owner's retention decision. `shred` is not a reliable substitute for encryption
on SSDs, snapshots or copy-on-write filesystems.

## Later bootstrap commands — NOT executed or authorized now

First verify Sydney service access, minimum balance/account-plan window and encrypted
workspace/swap protections. Refresh STS identity; if it differs, stop. Set
`ABOX_SECURE_WORK` to a verified encrypted directory outside this repository.
The following checks verify paths/permissions only, **not** encryption.

```sh
: "${ABOX_SECURE_WORK:?Set the verified encrypted external directory}"
test -d "$ABOX_SECURE_WORK"
umask 077
ulimit -c 0
chmod 700 "$ABOX_SECURE_WORK"
export TMPDIR="$ABOX_SECURE_WORK/tmp"
mkdir -p "$TMPDIR" "$ABOX_SECURE_WORK/bootstrap" "$ABOX_SECURE_WORK/application"
unset TF_LOG TF_LOG_PATH TF_LOG_CORE TF_LOG_PROVIDER
test "$(aws --profile abox-747240980964 --region ap-southeast-2 \
  sts get-caller-identity --query Account --output text)" = 747240980964
cp infra/aws-state/*.tf infra/aws-state/.terraform.lock.hcl "$ABOX_SECURE_WORK/bootstrap/"
cp infra/aws-state/backend_override.tf.example "$ABOX_SECURE_WORK/bootstrap/"
export TF_DATA_DIR="$ABOX_SECURE_WORK/bootstrap/.terraform"
cd "$ABOX_SECURE_WORK/bootstrap"
terraform init -input=false -backend-config="path=$ABOX_SECURE_WORK/bootstrap/bootstrap.tfstate"
terraform validate
terraform plan -input=false -lock-timeout=5m -out=bootstrap.tfplan
terraform show -no-color bootstrap.tfplan
sha256sum bootstrap.tfplan
```

Stop for explicit approval of the saved bootstrap plan. Expected **eight** creates:
one bucket, public access block, ownership, versioning, encryption, bucket policy,
and two IAM policies. No identity attachments or application resources.
Only after that approval may an operator run `terraform apply bootstrap.tfplan`.
Verify bucket owner, region, encryption, public-access blocks, versioning and policy
using read-only S3 APIs with `--expected-bucket-owner 747240980964` where supported.
Test concurrent locking with disposable configuration and scoped keys only under
separate authorization; mocked tests do not prove lock contention against S3.

After a **separate explicit migration approval**, record the actual bucket name as
`bucket = "ACTUAL_BUCKET_OUTPUT"` in mode-0600 `backend.hcl` on the encrypted volume.
Activate the supplied override only in this protected bootstrap copy:

```sh
cp backend_override.tf.example backend_override.tf
terraform init -migrate-state -backend-config=backend.hcl
```

This is an interactive migration; inspect the source/destination and answer only
after confirming they match the approval. Never combine `-reconfigure` with migration,
never use `-force-copy`, and preserve the encrypted source/backup until verified.
Confirm no other operator is active and inventory all local/destination state
objects first. After migration, compare lineage, serial and resource addresses
using protected files on the encrypted volume; verify S3 AES256/versioning and
successful normal lock/unlock. Keep an encrypted offline source copy until accepted.
The [override-file semantics](https://developer.hashicorp.com/terraform/language/files/override)
replace the backend block; future bootstrap maintenance must retain this override.
The application has no known state from this task. Inventory any existing state
before initializing it; do not assume an empty destination is safe to overwrite.

From the repository, copy `infra/aws-demo/*.tf`, `user-data.sh`, the lock file and
reviewed private tfvars into the encrypted `application` directory. Supply the same
bucket in its private `backend.hcl`. Set `TF_DATA_DIR` to that directory's `.terraform`.
For a confirmed new application state, `terraform init -backend-config=backend.hcl`
initializes the prepared S3 backend. Existing local state requires a separately
reviewed migration with its original backend metadata preserved. Keep
`free_plan_verified=false` until the pre-plan account, balance/account-plan window,
Sydney service-access and secure-storage gates pass. Image publication and live
deployment acceptance remain later gates. No application plan
or deployment becomes authorized by approving the state bucket alone.

## Cost and verification

Public Sydney S3 catalog fetched 2026-10-28 local date, without account
credentials: Standard storage **$0.025/GB-month**, PUT/COPY/POST/LIST
**$0.0055/1,000**, GET/other Tier-2 requests **$0.0044/10,000**.
[AWS price catalog](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-southeast-2/index.json),
[S3 pricing](https://aws.amazon.com/s3/pricing/).
SSE-S3 has [no additional encryption charge](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingServerSideEncryption.html).
IAM and native S3 locking add no separate fixed service fee; locking incurs ordinary
S3 requests. No DynamoDB or customer-managed KMS cost is introduced.

Example allowance: **1 GB total current/historical objects**, **2,000 Tier-1** and
**5,000 Tier-2 requests/month** costs **$0.0382/month**, **$0.0764/two months**,
before taxes, internet transfer, optional auditing/metrics and additional versions.
Budget **$0.10/month** for a small manually operated backend; this is not a cap.
Unexpired historical versions keep accruing storage costs after EC2 stops.
Balance/account-plan window and service access must be rechecked before creation;
grant expiry and applicability remain owner-waived under ABOX-RISK-001. Preserve
the $5 budget and the separate proposed abox gross-cost alerts.

Local checks use cached provider packages and credentials disabled. `terraform
validate` checks both roots; `terraform test` in this root uses only a mocked AWS
provider and plan commands. Those tests check privacy, versioning/encryption,
account/TLS denials and separate exact-key state/lock permissions. No live S3 API,
real plan, bootstrap creation, migration, recovery or IAM attachment was tested.

Executed 2026-10-28 (local date):

| Check | Result |
| --- | --- |
| `terraform fmt -check -recursive infra/aws-state` and `terraform fmt -check infra/aws-demo` | PASS |
| `terraform -chdir=infra/aws-state init -backend=false -input=false -plugin-dir=/mnt/storage/projects/hospitalProject/terraform/.terraform/providers` | PASS; cached provider only, no state backend initialized |
| Credential-disabled `terraform validate` for both roots | PASS |
| Credential-disabled `terraform -chdir=infra/aws-state test -no-color` | PASS: three plan-only mocked tests, eight assertions |
| Disposable bootstrap configuration copy with active S3 override | PASS with lock file and cached provider; first attempt omitted the provider lock file and failed before validation |
| `python3 -m unittest discover -s deploy/aws-demo -p 'test_*.py' -q` | PASS: nine existing offline safety tests |
| `git diff --check` | PASS |
| Real AWS plan, S3 access/locking/recovery and state migration | NOT RUN; encrypted workspace and explicit approvals outstanding |

CloudFormation was evaluated as a way to avoid local bootstrap state, but the
prepared implementation stays with Terraform. No CloudFormation artifacts,
validator installation or extra project dependencies are required.

In the latest local remediation review, both root validations, all three mocked
security tests, formatting and the expanded 16-test offline deployment suite were
executed successfully again. No IAM attachment, live native lock contention,
S3 recovery, real plan or migration was performed. Scope/role selection, encrypted local storage and live
backend checks must independently pass before this design becomes GO. Sydney
regional read access has now passed; it does not prove provisioning permissions.
