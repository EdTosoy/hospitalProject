# abox EC2 readiness — 2026-10-28 (Asia/Manila)

**Decision: NO-GO. No Terraform plan generated.** Singapore API access, a successful
native frontend probe, and verified encrypted state storage are required before
planning. Full EC2 remains the selected platform; Lightsail is reserved for FATS.
This audit made no AWS resource changes, DNS changes, image publications, commits,
pushes, or account-plan changes. Only synthetic build probes were used.

## Verified target and billing

- Started with a clean working tree at `9ce67b53646a178eb5c47701730ce3b974737664`.
  The requested infrastructure, deployment scripts and manual image workflow are
  committed. Historical `terraform/` and deployment workflows were not executed.
- Only the authorized `edtosoy` profile and its newly created alias were invoked.
  STS identifies account **747240980964**, using `AccountFullAccessRole`.
  `iam get-role` independently confirms the account and matching role ID;
  `freetier get-account-plan-state` independently returns the same account ID.
- Free Tier API reports **FREE / ACTIVE**, **USD 120.00 remaining**, and account
  plan expiration **2027-04-26 13:49:39.175 UTC**. This is an observed available
  balance, not an assumed promotional award. Activities show the budget award
  completed, but the EC2 award and three other activities are NOT_STARTED; none
  of those prospective rewards is included in the estimate.
- The API reports plan expiration, not individual credit-grant expiration dates.
  Individual grant expiry still needs confirmation in Billing → Credits before
  claiming fully verified credit runway. The account-plan API's exact response
  semantics are documented by [AWS](https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_freetier_GetAccountPlanState.html).
- Existing budget `mdp-monthly-gross-usd-5` is **$5/month**, excludes credits and
  refunds, and includes tax/support. It was read and preserved unchanged.
- Added local profile `abox-747240980964` to `~/.aws/config`, reusing only
  `edtosoy`'s existing `login_session`, with region `ap-southeast-1`. No credentials
  were copied or printed. STS through that alias confirms the expected account.
  The original profile's configured region is `ap-southeast-2`; all requested
  regional audit calls explicitly used Singapore. No alternate region was tried.
- Wrote ignored, mode-0600 `infra/aws-demo/terraform.tfvars`, pinning the alias and
  independently verified account ID. Provider `allowed_account_ids` remains
  enforced. `free_plan_verified=false` remains intact. The proposed end date
  `2026-12-28` is tentative and requires agreement before planning. This file has
  identifiers only; it is not state, a plan, or a credentials file.

## Blocking account and state evidence

Singapore calls to `ec2:DescribeInstanceTypes`, `ec2:DescribeInstanceTypeOfferings`,
`servicequotas:GetServiceQuota` for Standard On-Demand vCPU quota `L-1216C47A`, and
`ssm:GetParameter` for the public AL2023 ARM64 AMI all return an **explicit service
control policy deny**, citing policy `p-7z6oj8hf`. `organizations describe-policy`
was denied, so the policy's contents and regional scope are unknown. Changing
IAM permissions alone cannot override this explicit SCP deny.

`organizations describe-organization` reports organization `o-84b00ga58n`.
This observation and FREE/ACTIVE are both actual API results. It does not establish
who arranged membership or justify changing account plans. The Terraform variable
description currently requires no Organizations membership; that policy assumption
must be reconciled with the account's actual operating arrangement before approval.
No organization, SCP, or plan change was attempted or proposed as an automatic fix.

The public Price List API lists Singapore `t4g.small` as Graviton2, 2 vCPU, 2 GiB,
at the rate below. A catalog entry does **not** verify this account's usable AZ
offering, quota headroom, launch permission, or live capacity. Those remain blocked.
EBS/VPC/S3 quotas and existing consumption were not verified; provisioning/PassRole
permissions and SSM/S3 operating access are not established by the role's name.

`findmnt` and `lsblk` show ext4 on `/dev/sda1` for the checkout/storage and ext4
on `/dev/nvme0n1p3` for `/` and `/tmp`, with no visible dm-crypt layer. This is
insufficient evidence of encrypted operator storage; lower-layer encryption could
exist but was not established. No secure external state directory was supplied
during the audit. Backend initialization with a state path, state writes and
planning were deliberately withheld. `init -backend=false` only initialized the
cached provider. Local Terraform state is not encrypted by Terraform itself.

## Application and infrastructure audit

The committed design uses one AL2023 ARM64 `t4g.small`, Standard CPU credits,
30-GiB encrypted gp3 at included baseline IOPS/throughput, IMDSv2/hop limit 1,
SSM administration, and TCP 80/443 ingress only. There is no SSH ingress, NAT,
load balancer, RDS, ECR, Lightsail or DNS resource. The ephemeral public IP changes
after stop/start. New AMI/user-data revisions can replace the instance; root EBS
is deleted on termination. These are accepted single-host tradeoffs only after
off-host recovery is proven.

Runtime IAM scopes backup access to this bucket's `demo/` prefix, without delete
permission, and permits SSM registration/session channels. S3 blocks public access,
requires TLS and explicit AES256 encryption, and expires backups after seven days.
These policies were inspected statically; there is no live instance or bucket
with which to prove them operationally.

Compose publishes only Caddy, keeps application/database networks internal, uses
file secrets, bounds memory/logs, and isolates one-shot migrations/seeding behind
the maintenance profile. Migrations run once per release after a pre-release
backup. Initial seed requires an empty synthetic user table. Restore targets a new
database and does not overwrite the active database. No migration, seed, live
backup, restore, TLS issuance or host release was executed in this audit.

Additional findings requiring resolution:

1. **Native frontend check fails.** Both production images build natively on ARM64;
   backend architecture, bcrypt and migration packaging pass. The subsequent
   frontend probe fails with `MODULE_NOT_FOUND: sharp` from
   `/app/apps/frontend/[eval]`. The frontend declares Next.js, with Sharp transitive
   through Next; this failure alone does not distinguish a probe resolution error
   from missing runtime packaging. Resolve and rerun before publication.
2. **Backup timer path mismatch.** With the documented layout
   `/opt/abox/releases/<SHA>/release.py`, `ROOT.parent.parent / "current"` in
   `release.py:52` resolves to `/opt/abox/releases/current`. The service and runbook
   use `/opt/abox/current`. The release can claim health while the scheduled backup
   command points at a missing release. Correct and verify this before host use.
3. **Runway guard is for 30 days.** `preflight.py` accepts $50 and 37 remaining
   days. That is not a two-month assertion. It also does not check organization
   membership, individual grant expiry, secure state, or current quota usage.
   Do not treat its approval JSON as proof of those prerequisites. Establish a
   two-month window plus shutdown margin and $25 reserve before enabling the guard.
4. Host bootstrap, restricted egress with package installation, AWS CLI presence,
   actual SSM registration, 2-GiB host memory under representative ARM load, live
   HTTPS/cookies and S3 recovery remain deployment acceptance gates. Offline tests
   cannot establish these. Daily backup success still requires operator monitoring.

No application/infrastructure repair was silently bundled into this audit.

## Executed verification

| Check | Result |
| --- | --- |
| `terraform fmt -check infra/aws-demo` | PASS |
| `terraform -chdir=infra/aws-demo init -backend=false -input=false -plugin-dir=/mnt/storage/projects/hospitalProject/terraform/.terraform/providers` | PASS, cached AWS provider 6.56.0 |
| Credential-disabled `terraform -chdir=infra/aws-demo validate` | PASS with local provider socket permission; initial restricted-sandbox attempt failed to start the provider |
| `python3 -m unittest discover -s deploy/aws-demo -p 'test_*.py' -v` | PASS, nine mocked offline safety tests |
| `node --check deploy/aws-demo/backend-runtime.cjs` | PASS |
| `bash -n infra/aws-demo/user-data.sh deploy/aws-demo/init-db.sh` | PASS |
| `docker compose -f deploy/aws-demo/compose.yml --profile maintenance config --format json` with synthetic digest pins | PASS; six services, ARM64, private app/DB networks, only Caddy 80/443; no containers started |
| Current baseline CI at audited HEAD | PASS: [40513579605](https://github.com/EdTosoy/hospitalProject/actions/runs/40513579605) |
| Native ARM64 workflow, `publish=false` | FAIL frontend probe: [40601658172](https://github.com/EdTosoy/hospitalProject/actions/runs/40601658172); both image builds/backend probe passed; all registry login/publication steps SKIPPED |
| Terraform plan | NOT RUN: unresolved eligibility/access, native-probe and encrypted-state gates |

Before dispatch, remote workflow blob matched the local reviewed workflow
(`74a6916c99f905f6495830055f16366ef874ee9f`). Repository visibility was verified
public, using standard `ubuntu-24.04-arm`. Such runners are free for public
repositories under [GitHub's current terms](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
The build has no AWS credentials or provisioning steps. Packages write permission
exists in the job, but all login/push steps were conditional and skipped.

## Gross cost and credit runway

Prices were queried read-only from AWS Price List in `us-east-1`, filtering
Singapore. EC2 SKU `MZGPYWV687EP4MDV`, gp3 storage SKU `X8SY8CJFS8WV7VQN`,
and S3 Standard SKU `M6MTARCQFUQBQ2V3` support these rates. References:
[Singapore EC2 catalog](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/ap-southeast-1/index.csv),
[Singapore S3 catalog](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-southeast-1/index.json),
[public IPv4 pricing](https://aws.amazon.com/vpc/pricing/).

| Component | Monthly USD, 730 hours |
| --- | ---: |
| t4g.small, Linux shared On-Demand, $0.0212/hour | 15.476 |
| 30 GiB gp3, $0.096/GB-month | 2.880 |
| One public IPv4, $0.005/hour | 3.650 |
| Conservative 5 GB S3 Standard, $0.025/GB-month | 0.125 |
| Small backup request allowance (estimate) | 0.010 |
| **Total before tax/extra traffic** | **22.141** |

Python Decimal calculations: two 730-hour months cost **$44.282**, leaving
**$75.718** of the observed $120 if no other usage applies. At this rate,
the $25 reserve leaves **4.29 months** of theoretical runway; depletion is
**5.42 months**, additionally constrained by plan/grant expiry. Do not assume a
T4g promotion or future activity award. This is not a verified net invoice:
tax, abuse, shared egress allowance, other workloads and backup growth affect it.
Use **$25/month gross** and approximately **$50 for two months** as planning
allowances, plus the retained $25 reserve. Stopped EC2 still incurs EBS/S3 costs.

Recommend a separate budget `abox-account-gross-monthly` using the existing
`deploy/aws-demo/budget.example.json`, excluding credits/refunds. Use actual
25/50/80/100% and forecast 100% alerts, plus credit/expiry reminders. That example
is account-wide, so alerts include other workloads. Do not replace the $5 budget
or pretend the new budget is a hard cap. No budget/notification was created.

## Exact next commands and prerequisites

First resolve the Singapore SCP denial through the account administrator without
an account-plan change; establish permitted services/organization conditions and
grant expiry; repair and verify the two application/deployment findings; and
identify existing encrypted operator storage. No other profile, region, paid plan,
or creation-based diagnostic is an automatic fallback. Once fixes are separately
committed/pushed by the owner, rerun the nonpublishing native build:

```sh
gh workflow run abox-images.yml --repo EdTosoy/hospitalProject --ref main -f publish=false
gh run list --repo EdTosoy/hospitalProject --workflow abox-images.yml --limit 3
```

After all prerequisites pass, use an actual verified encrypted directory for
`ABOX_PRIVATE_DIR`. The shell assertion intentionally fails until supplied.
Transfer the ignored target tfvars into it, agree the end date, and change
`free_plan_verified` only after the complete gates pass; never merely to get a plan.

```sh
: "${ABOX_PRIVATE_DIR:?Set the absolute verified encrypted directory outside the repository}"
umask 077
test -d "$ABOX_PRIVATE_DIR"
chmod 700 "$ABOX_PRIVATE_DIR"
cp -n infra/aws-demo/terraform.tfvars "$ABOX_PRIVATE_DIR/demo.tfvars"
# Review private tfvars; confirm all gates and the agreed end date before setting true.
aws --profile abox-747240980964 --region ap-southeast-1 sts get-caller-identity
python3 deploy/aws-demo/preflight.py \
  --profile abox-747240980964 --expected-account-id 747240980964 \
  --output "$ABOX_PRIVATE_DIR/account-approval.json"
terraform -chdir=infra/aws-demo init -input=false \
  -backend-config="path=$ABOX_PRIVATE_DIR/terraform.tfstate"
terraform -chdir=infra/aws-demo validate
terraform -chdir=infra/aws-demo plan -input=false \
  -var-file="$ABOX_PRIVATE_DIR/demo.tfvars" \
  -out="$ABOX_PRIVATE_DIR/reviewed.tfplan"
terraform -chdir=infra/aws-demo show -no-color "$ABOX_PRIVATE_DIR/reviewed.tfplan"
```

Stop after reviewing that actual plan. Review one instance, Standard CPU credits,
encrypted 30-GiB gp3, restricted networking/IAM, private encrypted backup storage,
the correct account and no unrelated resources. No `apply`, publication, DNS or
host deployment is authorized by this report. Exact host release commands remain
in `deploy/aws-demo/README.md`, but its backup-path defect must be repaired first.
