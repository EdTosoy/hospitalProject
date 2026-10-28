variable "aws_profile" {
  type        = string
  description = "A dedicated named profile for the owner's new account; never default or a Flow profile."
  validation {
    condition     = var.aws_profile == "abox-747240980964"
    error_message = "Use only the owner-confirmed abox-747240980964 profile."
  }
}

variable "expected_account_id" {
  type        = string
  description = "Owner-confirmed target account ID; the provider rejects any other account."
  validation {
    condition     = var.expected_account_id == "747240980964"
    error_message = "The only authorized account is 747240980964; set it in the private tfvars file."
  }
}

variable "free_plan_verified" {
  type        = bool
  default     = false
  description = "Set true only after fresh preflight confirms FREE/ACTIVE, minimum balance/account-plan window and Sydney service access, plus verified secure state storage. Individual credit expiry and applicability are owner-waived under ABOX-RISK-001, not verified. Never change account plans or organization policies to bypass restrictions."
  validation {
    condition     = var.free_plan_verified
    error_message = "Do not plan/apply until the owner has verified FREE/ACTIVE, minimum balance/account-plan window, Sydney service access, and secure state storage. Credit expiry/applicability are owner-waived under ABOX-RISK-001. Never upgrade the plan."
  }
}

variable "backup_bucket_suffix" {
  type        = string
  description = "Non-secret unique suffix for this demo's backup bucket."
  validation {
    condition     = can(regex("^[a-z0-9]{6,16}$", var.backup_bucket_suffix))
    error_message = "Use 6-16 lowercase letters/digits."
  }
}

variable "demo_end_date" {
  type        = string
  description = "An agreed YYYY-MM-DD teardown date before account-plan expiry. Individual grant expiry/applicability checks are owner-waived under ABOX-RISK-001. This tag is a reminder, not an automatic scheduler."
  validation {
    condition     = can(regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$", var.demo_end_date)) && can(formatdate("YYYY-MM-DD", "${var.demo_end_date}T00:00:00Z"))
    error_message = "Supply a valid agreed teardown date."
  }
}
