# abox AWS demo operations

**Phase 3A is files and local verification only. Do not execute provisioning,
publication, or host deployment commands during Phase 3A.** The new account will
be configured later. No default/Flow account may be used.

The later requested read-only `kuyas-general` check returned **PAID / ACTIVE**
(masked account ending 0564). Do not use it for this Free-plan deployment or try
to change its plan. The intended Free account still needs separate verification.

See [the preparation report](../../docs/aws-demo-preparation.md) for cost,
eligibility, verification evidence, architecture, and the Phase 3B decision.
Historical Terraform, Kubernetes, ECR, and deployment scripts are separate and
must not be used for this demo.

## Phase 3B prerequisites — separate authorization required

Before **any** resource creation or image publication, obtain an explicit Phase
3B authorization against this reviewed configuration and satisfy these gates:

1. Owner verifies the newly created account, remains on **Free**, and never
   creates/joins Organizations, uses Control Tower, or chooses an upgrade. Use a
   dedicated MFA-backed `abox-*` CLI profile. Do not create root access keys or
   bootstrap Organizations/Identity Center as a shortcut. No existing profile is
   assumed to be the correct account.
2. Verify FREE/ACTIVE, at least $50 in available credits, at least 37 days before
   account-plan expiry for a 30-day demo plus margin, and the actual expiry of
   credits. Confirm EC2/T4g, gp3 encryption, S3, SSM Session Manager, and standard
   Parameter Store availability under Free. If any requires Paid, **stop**.
3. Owner confirms vCPU quota of at least 2, available T4g small capacity/AZ,
   supported AL2023 ARM64 AMI, the monthly gross-cost budget, notifications, and a
   dated teardown appointment. No quota-increase, paid-instance, SSH, or paid
   service fallback is automatic.
4. Use an encrypted operator-controlled filesystem outside the checkout for all
   Terraform state, plans, private tfvars, and recovery copies. Directory mode
   0700, `umask 077`, single operator/local state lock. A local backend does not
   encrypt state itself. If encrypted storage is unavailable, **stop** and review
   a secure backend separately; do not silently create a state service/account.
5. Current application CI must pass. Run the prepared manual native ARM64 build
   with `publish=false`, then review its native bcrypt/Sharp checks. Only after
   separate publication approval run `publish=true`. Record image SHA tags and
   digests; verify anonymous pulls of the intended public GHCR packages. Do not
   put a registry PAT in Terraform, user data, env files, or container images.
6. Owner controls `abox.edtosoy.com` and `api.abox.edtosoy.com`, their A/AAAA/CAA
   records, and certificate issuance. Domain registration/renewal is outside AWS
   credits. No DNS purchase or Route 53 zone is created by this configuration.
7. Demo users/records are synthetic only. Do not import a development/production
   database, patient screenshots, real names/contact details, or clinical notes.
   Inform demo participants not to enter real personal/clinical data.

## Owner read-only preflight, after account configuration

These commands are for later, with the confirmed account. Account IDs are
identifiers, not credentials; keep the private files out of source control.

```sh
umask 077
# Point this at EXISTING encrypted storage, not a directory in the checkout.
export ABOX_PRIVATE_DIR=/path/to/encrypted/abox-demo
mkdir -p "$ABOX_PRIVATE_DIR"
chmod 700 "$ABOX_PRIVATE_DIR"

python3 deploy/aws-demo/preflight.py \
  --profile abox-free \
  --expected-account-id OWNER_CONFIRMED_ACCOUNT_ID \
  --output "$ABOX_PRIVATE_DIR/account-approval.json"
```

The script checks identity **first**, then Free-plan state/runway, ARM64 instance
specification/offering, Standard On-Demand vCPU quota, and the public AL2023 AMI
parameter. It makes read-only calls. An unknown/denied check blocks approval.
It does not print identity ARNs, account IDs, credit amounts, or credentials. The
three-hour approval contains an account hash and pass/fail assertions, not billing
responses. It does not prove all service permissions or SSM connectivity before
an instance exists. Confirm these with the owner; do not upgrade to resolve them.

Refresh the approval immediately before deployment. Copy it securely to
`/etc/abox/account-approval.json` on the eventual host, root-owned mode 0600.

## Terraform plan and later authorized provisioning

Copy `infra/aws-demo/terraform.tfvars.example` to the encrypted private directory.
Set the actual account ID, the dedicated profile, a unique non-secret bucket
suffix, a teardown date before account expiry, and `free_plan_verified=true`
**only after** the gates above pass. The shipped example intentionally blocks
planning. Terraform's provider also rejects any account ID other than the one
explicitly supplied.

```sh
terraform -chdir=infra/aws-demo init -input=false \
  -backend-config="path=$ABOX_PRIVATE_DIR/terraform.tfstate"
terraform -chdir=infra/aws-demo validate
terraform -chdir=infra/aws-demo plan -input=false \
  -var-file="$ABOX_PRIVATE_DIR/demo.tfvars" \
  -out="$ABOX_PRIVATE_DIR/reviewed.tfplan"
```

Review the plan privately. Expect exactly one T4g small, one 30-GiB encrypted gp3
root disk, Standard CPU credits, no key pair/SSH ingress, only TCP 80/443 ingress,
a small VPC/subnet/route/IGW, the scoped instance role, and the private encrypted
backup bucket/lifecycle. There must be no NAT gateway, load balancer, ECR, RDS,
Kubernetes, paid KMS key, Marketplace AMI, Organizations, or upgrade resource.
Check AMI architecture and replacements; a new AMI/user-data revision can replace
the instance. State and plans contain infrastructure identifiers, so keep them
protected even though this configuration includes no passwords/secrets.

Only after explicit owner approval of that exact plan, in Phase 3B:

```sh
# NOT A PHASE 3A COMMAND. This creates resources and consumes credits.
terraform -chdir=infra/aws-demo apply "$ABOX_PRIVATE_DIR/reviewed.tfplan"
terraform -chdir=infra/aws-demo output instance_id
terraform -chdir=infra/aws-demo output public_ipv4
```

No command above was executed against AWS in Phase 3A. Do not run the legacy
`terraform/` root or legacy cloud deployment scripts. Check account plan/credits
again after launch; instance creation can earn extra credits, but none is assumed
in the estimate. Never enable a paid feature to claim credits or the T4g trial.

## Build/publish image release — manual and separate from AWS

The new `.github/workflows/abox-images.yml` is manual, main-only, and defaults to
no publication. It runs on a standard native ARM64 runner, with no AWS credential,
OIDC, ECR, or infrastructure step. The current repository is public; verify it
remains public and only a standard runner is used to avoid runner charges.

After explicit authorization to trigger the build (and later to publish):

```sh
gh workflow run abox-images.yml --ref main -f publish=false
# Inspect that exact run's build/native-module outcomes first.
# Only when publication is separately approved:
gh workflow run abox-images.yml --ref main -f publish=true
```

The workflow treats `sha-<40-char-commit>` tags as write-once and refuses an
existing tag. GitHub's registry does not make tag strings inherently immutable;
production `release.env` requires `:sha-<commit>@sha256:<digest>` for both app
images and validates matching revision labels and `arm64` architecture. The
digest is the actual immutability guarantee. A partial publication must be
reviewed manually; the workflow does not overwrite/retry an existing SHA tag.
If transferring this repo to an organization, review the package-owner API path
in the tag guard before publishing; it currently targets this user-owned repo.

The two Dockerfiles accept a `NODE_IMAGE` build argument; the manual workflow
pins the reviewed multi-architecture Node 22 digest. Existing default builds
remain supported. Frontend builds embed `https://api.abox.edtosoy.com` at build
time. Builds run off the 2-GiB EC2 host. Update base/Postgres/Caddy pins only in a
reviewed, rebuilt release; do not use `latest` or mutable app tags.

## Host setup over SSM

After the owner confirms SSM is permitted/online, connect using the local Session
Manager plugin and the explicitly named profile:

```sh
aws --profile abox-free --region ap-southeast-1 ssm start-session \
  --target OWNER_VERIFIED_INSTANCE_ID
```

If SSM is unavailable, stop and investigate registration, instance-role policy,
agent version, public egress/DNS, and service availability. Do not open SSH or
upgrade. The minimal instance policy covers registration/session channels and
only this bucket's `demo/` objects; it cannot upgrade billing or create resources.

User data installs Docker and a checksum-verified Compose v5.4.0 ARM64 plugin,
starts Docker/SSM, and creates private directories. It contains **no application
secrets or AWS keys** and does not start the app. Check bootstrap success, the
AL2023 security update status, disk free space, and `aws --version` over SSM.

Transfer only the contents of `deploy/aws-demo/` to
`/opt/abox/releases/<approved-40-char-SHA>/` via an owner-approved secure transfer
over SSM. Do not expose an upload endpoint, install Git credentials, or include
private env/secret files in a release tarball. Keep the directory root-owned mode
0700. Preserve earlier release directories for rollback; do not prune them blindly.

Within that release directory, copy `release.env.example` to `release.env` and
fill image pins, account/bucket IDs, and the fixed demo DB name. This file contains
only non-secret configuration. Generate host-only secrets exactly once:

```sh
sudo python3 /opt/abox/releases/APPROVED_SHA/generate-secrets.py
```

The generator refuses repository paths and existing/partial secrets. Directory
`/etc/abox/secrets` stays 0700; files are read-only and readable inside their
explicit Compose secret mounts by Node and PostgreSQL. Do not loosen the host
directory. Compose file secrets are bind mounts, not a managed encrypted secret
store: EBS encryption and host-root access control protect them. No values are
printed or included in Docker's configured environment. Keep encrypted recovery
copies in the owner's password manager outside this AWS account, particularly
the synthetic demo login password; a logical dump contains password hashes, not
the original password. Do not regenerate secrets on an existing database volume.

Set both DNS A records to the verified instance address; remove stale AAAA
records unless IPv6 is deliberately configured later. Use DNS-only records for
the initial direct Caddy test. Caddy serves these exact two hostnames, obtains
certificates automatically, and redirects HTTP to HTTPS. It has no on-demand TLS.
Only TCP 80/443 is published; HTTP/3 is disabled, so UDP 443 is unnecessary.

The release command below serializes maintenance, verifies the instance account,
fresh owner approval, image architecture/revision, then starts PostgreSQL, stops
old web processes, makes an off-server backup, runs **one** migration job, optionally
seeds an empty DB with the existing synthetic fixture, and starts the healthy app.
It stops on errors with no automatic downgrade or blind migration retry.

```sh
# First release only: no imported database or existing user rows.
sudo python3 /opt/abox/releases/APPROVED_SHA/release.py \
  --confirm-synthetic-demo --initial-seed

# Subsequent approved release: NEVER seed again.
sudo python3 /opt/abox/releases/NEXT_APPROVED_SHA/release.py \
  --confirm-synthetic-demo
```

Do not run `docker compose up` as a substitute for the migration sequence. The
`maintenance` profile excludes migrations/seeding from normal service startup.
An interrupted initial DB initialization must be diagnosed; never delete a
database volume to make startup succeed. For a brand-new *confirmed empty* demo
volume, any reset still requires explicit operator approval.

## Verification and 2-GiB operating envelope

Verify `https://abox.edtosoy.com/login`, `https://api.abox.edtosoy.com/health`,
HTTP-to-HTTPS redirect, valid certificates, permitted Origin preflight, denied
unapproved Origin, login/reload/logout, and the six synthetic roles. Use the
password manager; do not echo secrets, session cookies, or bearer tokens in logs.
Never take screenshots containing real data or password fields.

The API cookie stays host-only on the API domain, Secure/HttpOnly/SameSite=Lax.
The two HTTPS subdomains are same-site but cross-origin; the frontend already
uses `credentials: include`, and the API allows exactly the frontend origin.
No cookie/authorization code is changed. Caddy forwards the Origin header and
supports WebSocket upgrades. Swagger `/api` is blocked at the proxy.

Container limits total 1184 MiB: PostgreSQL 320, backend 384, frontend 384,
Caddy 96. Migration/seed are 256 MiB, run sequentially while web processes are
stopped. Node heaps are capped at 256 MiB; PostgreSQL uses 64 MiB shared buffers,
20 connections, 2 MiB work_mem. Image cache is a bounded 32-MiB tmpfs. Docker logs
rotate at 3×5 MiB per service. Keep at least 5 GiB free disk and 400 MiB host
memory available under representative use. Check `free -m`, `df -h`,
`docker stats --no-stream`, OOM/restart counters, and basic EC2 CPU-credit metrics.
Never build on this host or enable Unlimited CPU credits. In Standard mode,
credit exhaustion causes throttling; it does not buy surplus CPU credits.

`/health` is process liveness, not an ongoing DB query. Database health and a
real synthetic authenticated read must also pass. The unchanged backend limiter
sees Caddy's proxy IP and can share its 20-login/minute bucket across visitors;
this is a small-demo limitation. No arbitrary proxy trust was enabled.

## Backups, restore, and rollback

After the first successful manual backup, install and enable the reviewed timer:

```sh
sudo install -m 0644 /opt/abox/current/abox-backup.service /etc/systemd/system/
sudo install -m 0644 /opt/abox/current/abox-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now abox-backup.timer
sudo systemctl list-timers abox-backup.timer
```

Backups run daily at 04:15 UTC and before releases. `backup.py` uses the instance
role, validates the account, takes a consistent PostgreSQL 17 custom-format
logical dump, uploads over TLS with explicit SSE-S3 AES256 and SHA256 checksum,
checks object encryption/size, and removes temporary files from encrypted EBS.
No static AWS credentials are present. Each dump is capped at 500 MiB; total
prefix storage is capped at 5 GiB. S3 expires `demo/` objects after seven days
and incomplete multipart uploads after one day. Lifecycle deletion is asynchronous;
a full cap fails the backup for operator investigation instead of deleting
recovery points. Non-versioned, timestamped keys avoid unbounded old versions.
The role cannot delete backups or change bucket policy/lifecycle. S3/host admins
remain trusted: this is not an immutable ransomware-proof backup service.

Check the timer/journal and the newest backup daily; investigate any failure
immediately. RPO is at most 24 hours only while backups succeed. Target RTO is
60 minutes but is not proven on AWS. No paid notification or CloudWatch log sink
is silently enabled. Owner monitoring is part of the demo operating agreement.

To rehearse or recover, obtain fresh owner preflight approval, choose the correct
pre-release backup key from the private bucket, and restore into a **new** DB:

```sh
sudo python3 /opt/abox/current/restore.py \
  --confirm-synthetic-restore --key demo/VERIFIED_TIMESTAMP.dump
```

The actual key format is `demo/YYYYMMDDTHHMMSSffffffZ.dump`. The script validates
bucket owner, encryption, size, and download checksum, then creates
`abox_restore_<UTC timestamp>` and restores transactionally as the non-superuser
app role. It never drops/overwrites the active DB or switches traffic. Inspect
the candidate's migration history, fixture row counts, and synthetic data.
Keep the active DB until the candidate is accepted; remove candidates only after
separate explicit approval to avoid accumulating disk usage.

For an app-only rollback, only use the previous image digests when schema
backward compatibility is established. Copy the previous release bundle into a
new private rollback directory, retaining its original revision label and image
pins, restore its `release.env`, and run its reviewed release procedure with no
seed. If schema compatibility is uncertain, first restore the **pre-migration**
backup into a new candidate DB, set `DATABASE_NAME` in the rollback bundle to
that verified candidate, then deploy the previous images. Never pretend changing
an image reverses a database migration. A failed deployment remains a manual
recovery event; there is no automated destructive rollback or schema downgrade.

## Cost control, shutdown, and recovery outside the trial account

Configure a whole-account monthly **gross** cost budget around $25 using
`budget.example.json`: credits and refunds excluded, taxes/support included.
Plan email notifications at 25/50/80/100% actual and 100% forecast. Confirm the
owner receives a test notification and native Free-plan credit/expiry alerts.
Budgets are delayed alerts, **not** a hard spending cap. Do not enable paid
automation or upgrade if Budgets/features are unavailable; resolve this with the
owner before Phase 3B.

Separately inspect the actual remaining-credit balance and account expiry in
the Free Tier console/API. Excluding credits keeps underlying usage visible;
it does not show the remaining promotional balance. Do not automate charged
Cost Explorer API polling. Stop the demo when credits approach **$25 remaining**
or seven days before plan expiry, whichever comes first; set owner calendar
reminders. Backups and EBS still consume credits while compute is stopped.

Before cutoff, export a verified logical backup and the encrypted state/secret
recovery material to owner-controlled encrypted storage **outside AWS**. Free
account expiry/exhaustion can make services and same-account backups inaccessible;
do not plan on upgrading to regain them. The original 30-GiB root volume is
deleted on instance termination, so S3/offline recovery must be verified first.
Clear demo DNS records before releasing a public IP. Stop/start changes the IP;
it must be reverified and DNS updated before resuming.

Resource deletion (including any later `terraform destroy`) needs its own explicit
authorization and a reviewed plan. Do not delete a nonempty backup bucket to make
teardown succeed: `force_destroy=false` intentionally protects it. Export accepted
backups, approve bounded object deletion, then review resource teardown and verify
no EBS/IP/storage charges remain. Neither teardown nor provisioning is performed
by Phase 3A or by the image workflow.
