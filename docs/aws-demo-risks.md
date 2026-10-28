# abox deployment risk register

Applies only to account **747240980964**, profile **abox-747240980964**, Sydney
**ap-southeast-2**. Owner decision recorded 2026-10-28. This register does not
authorize AWS provisioning, state migration or privileged local storage changes.

| ID | Risk / prerequisite | Decision and status |
| --- | --- | --- |
| ABOX-RISK-001 | Individual promotional-credit expiration and service-specific credit applicability have not been independently verified; Billing GetCredits is SCP-denied. Credits might expire or fail to offset some charges. | **WAIVED — explicit owner acceptance. Not verified, not a deployment blocker.** Do not substitute the Free-plan expiration for a grant date, request the dates again, or retry a denied Billing API. The waiver does not waive live account identity, FREE/ACTIVE, minimum balance, account-plan window or service-permission checks. |
| ABOX-STATE-001 | Plain local storage/swap could persist Terraform plans, state and error recovery files. | **BLOCKED pending owner setup.** File-backed LUKS2 is viable in principle; tooling acquisition, authenticated sudo, module activation, swap protection and actual mount/reopen verification remain manual. The read-only guard must pass before sensitive operations. |
| ABOX-STATE-002 | S3 backend must exist before application backend initialization. | **BLOCKED pending separately approved bootstrap.** Review a local encrypted bootstrap plan, then obtain approval for its eight AWS resources. Bucket verification and state migration/init require explicit authorization. No bootstrap apply is performed by this task. |
| ABOX-IAM-001 | Current operator role is broad; unattached narrow backend policies do not restrict its existing privileges. | **Pending operator-access review.** Choose/review the scoped operator and recovery access before operational use. Never grant the application EC2 role Terraform state access. No IAM attachment or role creation is authorized here. |
| ABOX-COST-001 | Alerts are delayed and are not hard caps; tax, traffic and other account use can consume credits. | Retain $75 preflight minimum, $25 reserve and $25/month gross operating allowance. Preserve the existing $5 budget. Separate abox gross-cost alerts remain proposed; no budget change is made. Grant-expiry/applicability checks remain waived under ABOX-RISK-001. |
| ABOX-LIVE-001 | Single-host capacity, live SSM/HTTPS/auth, S3 backup recovery and runtime memory limits cannot be proven offline. | **Post-provision acceptance gates**, not prerequisites to review an infrastructure plan. Require them before opening the synthetic demo. No real patient data, automatic account upgrade or paid-service fallback. |

Preflight approval records now distinguish
`credit_balance_and_plan_window_verified=true` from
`credit_expiry_verification=waived_by_owner` and
`credit_applicability_verification=waived_by_owner`, with waiver ID ABOX-RISK-001.
They do not assert `credit_runway_verified=true`. Old approval records must be
refreshed; expiry/applicability evidence is not requested as part of that refresh.

**Current decision:** NO-GO for sensitive local planning until the encrypted
workspace is activated and verified; NO-GO for an S3-backed EC2 plan until the
separately approved backend exists. The credit waiver is effective now and does
not need further approval or evidence. Local/no-AWS validation may continue.

## Local continuation verification — 2026-10-28

Completed the runbook alignment with ABOX-RISK-001, removed obsolete credit-date
arguments from runnable examples, corrected doubled shell continuations in the
planning checklist, and replaced the obsolete application local-backend commands
with the guarded encrypted-working-copy/S3 procedure. Historical reports explicitly
defer to the waiver and current checklist.

| Check | Result |
| --- | --- |
| `python3 -m unittest discover -s deploy/aws-demo -p 'test_*.py' -q` | PASS: 16 offline tests; AWS calls mocked |
| `python3 -m unittest discover -s infra/aws-state -p 'test_*.py' -q` | PASS: seven offline guard tests; mount/device observations mocked |
| `terraform -chdir=infra/aws-demo validate -no-color` and equivalent for `infra/aws-state` | PASS with AWS credentials/config disabled, outside the sandbox |
| `terraform -chdir=infra/aws-state test -no-color` | PASS: three mocked, plan-only security tests; no AWS client |
| `terraform fmt -check infra/aws-demo` and `terraform fmt -check -recursive infra/aws-state` | PASS |
| Shell examples in planning checklist, LUKS procedure and deployment runbook | PASS: 17 blocks parsed with `bash -n`; extracted preflight/bootstrap commands exercised with harmless shell functions to verify argument grouping and paths |
| `git diff --check` | PASS |
| LUKS activation/reopen, real AWS plan, bootstrap creation, migration/init and live acceptance | NOT RUN: owner setup and separate authorizations remain outstanding |

The first sandboxed Terraform validation/test attempts failed at provider startup.
The installed executable ran; repeating the same offline checks outside the
sandbox succeeded. These results do not establish live permissions, mounted
encryption, state recovery or deployment readiness. No cloud changes, privileged
storage operations, publication, commits or pushes were performed.
