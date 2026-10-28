#!/usr/bin/env python3
"""Read-only OWNER preflight for Phase 3B. Does not provision or configure AWS."""
import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
from decimal import Decimal, InvalidOperation
from common import CREDIT_RISK_WAIVER_ID, TARGET_ACCOUNT_ID, TARGET_PROFILE

DEMO_DAYS = 62
SHUTDOWN_MARGIN_DAYS = 7
MINIMUM_CREDITS = Decimal("75")  # Two $25 gross months plus a $25 reserve.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--expected-account-id", required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    args = parser.parse_args()
    if args.profile != TARGET_PROFILE or args.expected_account_id != TARGET_ACCOUNT_ID:
        raise RuntimeError("Use only the owner-confirmed abox-747240980964 profile and account 747240980964")
    if not args.output.is_absolute() or args.output.resolve().is_relative_to(pathlib.Path(__file__).resolve().parents[2]):
        raise RuntimeError("Store approval outside the checkout using an absolute path")
    env = {key: value for key, value in os.environ.items() if not key.startswith("AWS_")}
    env["AWS_EC2_METADATA_DISABLED"] = "true"

    def read(*command):
        result = subprocess.run(["aws", "--profile", args.profile, "--region", "ap-southeast-2", "--no-cli-pager", *command, "--output", "json"],
                                check=True, capture_output=True, text=True, env=env)
        return json.loads(result.stdout)

    # Identity is checked before any billing/EC2 reads; a wrong account stops here.
    if read("sts", "get-caller-identity")["Account"] != args.expected_account_id:
        raise RuntimeError("Identity mismatch; no further account reads performed")
    plan = read("freetier", "get-account-plan-state")
    if plan.get("accountPlanType") != "FREE" or plan.get("accountPlanStatus") != "ACTIVE":
        raise RuntimeError("An active Free plan is required; do not upgrade or continue")
    now = dt.datetime.now(dt.timezone.utc)
    expiry = dt.datetime.fromisoformat(plan["accountPlanExpirationDate"].replace("Z", "+00:00"))
    credits = plan.get("accountPlanRemainingCredits", {})
    amount = Decimal(str(credits.get("amount", 0)))
    required_window = dt.timedelta(days=DEMO_DAYS + SHUTDOWN_MARGIN_DAYS)
    if (credits.get("unit") != "USD" or not amount.is_finite() or amount < MINIMUM_CREDITS
            or expiry - now < required_window):
        raise RuntimeError("Insufficient balance/account-plan safety margin; do not launch")
    instance = read("ec2", "describe-instance-types", "--instance-types", "t4g.small")["InstanceTypes"][0]
    if instance["MemoryInfo"]["SizeInMiB"] != 2048 or "arm64" not in instance["ProcessorInfo"]["SupportedArchitectures"]:
        raise RuntimeError("Unexpected instance specification")
    offerings = read("ec2", "describe-instance-type-offerings", "--location-type", "availability-zone", "--filters", "Name=instance-type,Values=t4g.small")
    if not offerings["InstanceTypeOfferings"]:
        raise RuntimeError("T4g small unavailable; do not substitute another instance")
    quota = read("service-quotas", "get-service-quota", "--service-code", "ec2", "--quota-code", "L-1216C47A")
    if quota["Quota"]["Value"] < 2:
        raise RuntimeError("Insufficient Standard On-Demand vCPU quota; no increase requested")
    read("ssm", "get-parameter", "--name", "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64")
    approval = {
        "account_sha256": hashlib.sha256(args.expected_account_id.encode()).hexdigest(),
        "plan": "FREE", "status": "ACTIVE", "region": "ap-southeast-2",
        "credit_balance_and_plan_window_verified": True,
        "credit_expiry_verification": "waived_by_owner",
        "credit_applicability_verification": "waived_by_owner",
        "credit_risk_waiver_id": CREDIT_RISK_WAIVER_ID,
        "checked_at": now.isoformat(),
        "valid_until": min(now + dt.timedelta(hours=3), expiry).isoformat(),
    }
    # No account ID, credit amount, identity ARN, or credentials in the approval.
    fd = os.open(args.output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as handle:
        json.dump(approval, handle, indent=2)
        handle.write("\n")
    print("Verified target identity, FREE/ACTIVE plan, minimum balance/account-plan window, ARM type/offering, vCPU quota, and public AMI access. Approval expires within three hours.")
    print("Individual credit expiry and service-specific applicability are WAIVED by the owner (ABOX-RISK-001), not verified.")
    print("S3/SSM operating permissions, Budgets availability, secure state storage, DNS, and images still need owner review. No resources created.")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError:
        raise SystemExit("Read-only AWS preflight denied/failed; no approval written. Credentials and account responses withheld.")
    except (RuntimeError, KeyError, ValueError, InvalidOperation) as error:
        raise SystemExit(str(error) if isinstance(error, RuntimeError) else "Incomplete account response; no approval written")
