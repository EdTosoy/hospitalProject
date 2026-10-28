# abox Sydney readiness — 2026-10-28 (Asia/Manila)

**Decision: NO-GO for provisioning.** Sydney regional reads and native ARM64
verification now pass. Protected local state/plan
storage, reviewed bootstrap/application plans and live deployment acceptance
remain separate gates. No AWS resources, account plans, SCPs, DNS or registry
images were changed. No commit, push, Terraform apply/destroy or state migration
occurred. Working tree started clean at `a017240b70d8b32614f7978d200c8bb2902c1291`.

**Owner waiver update:** individual credit-expiry and service-specific credit
applicability checks are waived under [ABOX-RISK-001](aws-demo-risks.md).
They remain unverified and are not deployment blockers. Fresh identity,
FREE/ACTIVE, minimum balance/account-plan window, Sydney service access and
encrypted storage remain required. The [guarded planning checklist](../infra/aws-state/planning-checklist.md)
is the current procedure; privileged local setup, resource creation and state
migration remain separately authorized operations.

## Target and regional changes

The owner confirms account **747240980964** is assigned **ap-southeast-2 (Sydney)**.
All authenticated AWS reads in this review used only existing profile
`abox-747240980964`; STS verified its account before regional checks. Its local
region field was updated to Sydney, preserving its existing login session and
all other profiles. No credentials were copied, printed or committed.

Updated active application/bootstrap providers, both prepared S3 backend
configurations, host release/backup/restore AWS helper, preflight calls/approval
records, examples and operator commands to Sydney. Host operations continue to
use only the EC2 instance role, disabling operator config/credentials. Singapore
approval records are rejected. Exact account allowlists and wrong-account/default
profile rejection remain intact. Ignored private tfvars still pins this account
and profile, with `free_plan_verified=false`.

The historical `terraform/` root (us-east-1, Kubernetes/ECR/SSH-era deployment) and
legacy `.github/workflows/deploy.yml` were inspected and remain excluded from
this isolated demo. Do not use them. Regional resource reads target Sydney;
Pricing, Budgets and Billing reads used the normal global us-east-1 endpoints.
No regional fallback or SCP workaround was attempted. AWS documents assigned
project regions [here](https://docs.aws.amazon.com/accounts/latest/reference/project-regions.html).

## Executed read-only account checks

| Check | Evidence / result |
| --- | --- |
| STS | PASS: account 747240980964 via the authorized abox profile |
| Free-plan state | PASS: FREE / ACTIVE; USD 120.00 remaining |
| Account-plan expiry | 2027-04-26 13:49:39.175 UTC; **not a credit-grant expiry** |
| t4g.small specification | PASS: ARM64, 2 vCPU, 2048 MiB, FreeTierEligible=true |
| AZ offerings | PASS: ap-southeast-2a, ap-southeast-2b, ap-southeast-2c |
| Standard On-Demand quota L-1216C47A | PASS: 16 vCPU |
| Existing EC2 quota use | PASS: no pending/running/stopping/stopped instances returned in Sydney; 16 vCPU headroom for this snapshot |
| Public AL2023 ARM64 parameter | PASS: ami-087d45844d95e29aa |
| AMI metadata | PASS: Amazon owner 137112412989, ARM64, available, EBS root, HVM; al2023-ami-2023.12.20261026.1-kernel-6.18-arm64 |
| S3 | PASS: Sydney bucket listing permitted; count only inspected, existing bucket unchanged |
| SSM | PASS: public parameter and managed-node listing permitted; zero managed nodes |
| Existing budget | PASS: mdp-monthly-gross-usd-5 remains $5/month; IncludeCredit=false; unchanged |
| Individual credit expiry/applicability | UNVERIFIED; billing:GetCredits was SCP-denied. Owner-waived under ABOX-RISK-001; not a blocker. |

Representative commands executed (identity ran first):

```sh
aws --profile abox-747240980964 --region ap-southeast-2 sts get-caller-identity
aws --profile abox-747240980964 --region ap-southeast-2 freetier get-account-plan-state
aws --profile abox-747240980964 --region ap-southeast-2 ec2 describe-instance-types --instance-types t4g.small
aws --profile abox-747240980964 --region ap-southeast-2 ec2 describe-instance-type-offerings --location-type availability-zone --filters Name=instance-type,Values=t4g.small
aws --profile abox-747240980964 --region ap-southeast-2 service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A
aws --profile abox-747240980964 --region ap-southeast-2 ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64
aws --profile abox-747240980964 --region ap-southeast-2 ec2 describe-images --image-ids ami-087d45844d95e29aa
```

Offering is not guaranteed physical launch capacity, and read access does not
prove create/PassRole permissions or functioning SSM registration/S3 backup.
`FreeTierEligible` does not make all compute/network/storage usage free. The
earlier Singapore discovery blocker is resolved by the explicitly authorized
target change; policy restrictions remain in force.

## Credit expiry and safeguards

The owner confirms promotional credits expire **in April, beyond the planned
two-month deployment**. Record this as month-level owner confirmation only.
The exact grant date has not been independently verified or entered. Do not
substitute the account-plan expiry of April 26, 2027.

The installed AWS CLI 2.34.24 lacks `billing get-credits`. A temporary public
AWS SDK Billing model was loaded via `AWS_DATA_PATH` to make the documented
[read-only GetCredits request](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_billing_GetCredits.html)
for this account only, with payer-family aggregation disabled. AWS returned an
explicit SCP deny. No authorization/endpoint workaround or further credit API
attempt followed; no permission or account plan was changed. The temporary model
contains public API definitions only; no credential or credit response was saved.

The owner has waived independent grant-expiry and service-specific applicability
verification under ABOX-RISK-001. Do not request grant dates again or retry the
denied Billing API. Preflight no longer takes a credit-expiration argument; it
records explicit waiver fields instead of claiming fully verified credit runway.
It retains the $75 minimum ($50 operating allowance + $25 reserve), 69-day
account-plan window and exact caller-account verification. No grant date is
invented, and the source Terraform planning guard remains false.

## Revised Sydney costs

Current public AWS Price List calls were filtered to ap-southeast-2. Compute SKU
`EG26BW4WNM66NNWJ`, gp3 SKU `QR74UAP3E9WUYT9B`, S3 storage SKU
`5QVJMK36NJC9G6DC`. References: [Sydney EC2 catalog](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/ap-southeast-2/index.csv),
[Sydney S3 catalog](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-southeast-2/index.json),
[public IPv4 pricing](https://aws.amazon.com/vpc/pricing/).

| Component | Rate / assumption | USD/month |
| --- | --- | ---: |
| t4g.small Linux On-Demand | 730 × $0.0212/hour | 15.4760 |
| 30 GiB encrypted gp3 | 30 × $0.096/GB-month; baseline IOPS/throughput | 2.8800 |
| One public IPv4 | 730 × $0.005/hour | 3.6500 |
| Backup storage | Conservative 5 GB × $0.025/GB-month | 0.1250 |
| Backup requests | Small-demo allowance | 0.0100 |
| Dedicated state backend | 1 GB retained objects, 2,000 Tier-1 + 5,000 Tier-2 requests | 0.0382 |
| **Combined gross estimate** | Before credits, tax and extra transfer/usage | **22.1792** |

Sydney request rates are **$0.0055/1,000** PUT/COPY/POST/LIST and
**$0.0044/10,000** GET/other Tier-2 requests, slightly above the earlier Singapore
request rates. State-backend allowance remains $0.10/month. Native locking uses
ordinary S3 requests; SSE-S3 has no extra encryption fee and no KMS/DynamoDB
service is introduced.

Python Decimal calculation: two 730-hour months **$44.3584**, leaving
**$75.6416** of the observed $120 if there is no other account usage. About
**4.28 months** to the $25 reserve at this baseline, independently constrained by
actual grant/plan expiry. Keep the **$25/month gross operating allowance** and
separate proposed abox gross-cost alerts; preserve the existing $5 budget.
No prospective EC2 credit award or T4g promotional discount is assumed. Tax,
shared egress usage, abuse, retained state versions and other account workloads
can shorten runway. EBS/S3 still consume credits while EC2 is stopped.

## Native ARM64 and local verification

The corrected workflow and shared Sharp harness on remote main matched the local
committed versions before dispatch. Repository visibility was public. Executed:

```sh
gh workflow run abox-images.yml --repo EdTosoy/hospitalProject --ref main -f publish=false
```

**PASS:** [native ARM64 run 40605313852](https://github.com/EdTosoy/hospitalProject/actions/runs/40605313852)
at commit `a017240b70d8b32614f7978d200c8bb2902c1291`. Both production images built
on ubuntu-24.04-arm, backend bcrypt/migration-package checks passed, and the
corrected frontend Sharp PNG encode/decode probe passed. All registry login/tag
guard/push steps were **SKIPPED**. This task's region changes are local and do not
alter Dockerfiles, application source or the verified harness. No images were
published or committed source pushed by this task.

| Local check | Result |
| --- | --- |
| `python3 -m unittest discover -s deploy/aws-demo -p 'test_*.py' -v` | PASS: 16 tests; includes Sydney-only host calls/approval, wrong-account/default-profile rejection, runway and real-filesystem release/backup/restore/rollback tests |
| `terraform fmt -check infra/aws-demo` | PASS |
| `terraform fmt -check -recursive infra/aws-state` | PASS |
| Credential-disabled `terraform validate` for both roots | PASS |
| Credential-disabled `terraform -chdir=infra/aws-state test -no-color` | PASS: three plan-only mocked tests, eight security assertions |
| Configuration-only copy with Sydney bootstrap S3 override activated | PASS; no backend init/migration |
| Compose config with synthetic SHA/digest pins | PASS: six ARM64 services, private app/DB, only Caddy 80/443, maintenance migrator |
| Node probe syntax; bootstrap/init shell syntax | PASS |
| `git diff --check` | PASS |
| Actual Terraform plan, live state locking/recovery and deployment acceptance | NOT RUN; independent gates remain |

Terraform state design retains SSE-S3, versioning, public-access blocks, TLS-only
and same-account policies, separate exact-key client policies and lock-only delete
permissions. Neither policy is attached by this configuration. Account allowlists
remain at both backend/provider boundaries. Source bucket ownership, destination
controls, state lineage/serial and encrypted recovery must be verified before a
separately authorized migration. Neither validation nor mocked tests proves live
locking or effective least privilege of the operator's current broad role.

## LUKS review and next safe step

The [file-backed LUKS2 workspace proposal](../infra/aws-state/luks-workspace.md)
remains suitable for this small bootstrap without partition changes. It has not
been executed. Current read-only inspection still finds no cryptsetup CLI on
PATH, active plain-partition swap and ext4 without verified backing encryption.
Required manual actions are approved CLI acquisition, host device-mapper access,
container creation/unlock/mount, independent backing-file/encryption proof,
swap/hibernation protection, private permissions and close/reopen/recovery checks.
Keep cwd, plans, `TF_DATA_DIR`, `TMPDIR`, migration backups and error state inside
the verified mount. Never run Terraform sensitive operations in an unmounted
fallback directory. Formatting/mount/swap changes require separate approval.

Next safe step: approve/verify the local
encrypted workspace. Then prepare and review a **bootstrap-only** plan from that
workspace under the [state runbook](../infra/aws-state/README.md). Do not apply it
without approval; state migration requires another explicit approval. Application
images must later be separately authorized for publication and pinned by digest.
SSM/bootstrap, real HTTPS/cookies, representative 2-GiB ARM host use, and S3
backup/restore remain live acceptance gates. Only the two credit checks recorded
under ABOX-RISK-001 are waived.

## Exact changed files

- `infra/aws-demo/versions.tf`, `variables.tf`, `terraform.tfvars.example`:
  Sydney application/provider/backend target and correct named-profile example.
- `infra/aws-state/versions.tf`, `backend_override.tf.example`, `README.md`:
  Sydney bootstrap/provider/backend, current procedures and refreshed state costs.
- `deploy/aws-demo/common.py`, `preflight.py`, `test_safety.py`, `README.md`:
  Sydney host/preflight/approval region, regression tests and exact operator commands.
- `docs/aws-demo-preparation.md`, `docs/aws-ec2-readiness-2026-10-28.md`:
  historical Singapore results marked superseded; active command region corrected.
- This Sydney readiness report.
- Local `~/.aws/config`: only the existing abox profile's region field changed.

The LUKS proposal, IAM resource definitions, Compose file, Dockerfiles and native
workflow were reviewed and required no edits in this region-change task.
