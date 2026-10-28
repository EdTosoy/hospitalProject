variable "aws_profile" {
  type        = string
  description = "A dedicated named profile for the owner's new account; never default or a Flow profile."
  validation {
    condition     = can(regex("^abox-[a-z0-9-]+$", var.aws_profile))
    error_message = "Use a dedicated abox-* profile after confirming its account identity."
  }
}

variable "expected_account_id" {
  type        = string
  description = "Owner-confirmed target account ID; the provider rejects any other account."
  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_account_id)) && var.expected_account_id != "000000000000"
    error_message = "Set the actual owner-confirmed account ID in a private, ignored tfvars file."
  }
}

variable "free_plan_verified" {
  type        = bool
  default     = false
  description = "Set true only after fresh read-only preflight confirms FREE/ACTIVE, two-month credit/expiry runway, and permitted services in Sydney. Verify AWS-managed project region restrictions; never change account plans or organization policies to bypass them."
  validation {
    condition     = var.free_plan_verified
    error_message = "Do not plan/apply until the owner has verified the Free plan, credit runway, service access, and secure state storage. Never upgrade the plan."
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
  description = "An agreed YYYY-MM-DD teardown date before plan/credit expiry. This tag is a reminder, not an automatic scheduler."
  validation {
    condition     = can(regex("^[0-9]{4}-[0-9]{2}-[0-9]{2}$", var.demo_end_date)) && can(formatdate("YYYY-MM-DD", "${var.demo_end_date}T00:00:00Z"))
    error_message = "Supply a valid agreed teardown date."
  }
}
