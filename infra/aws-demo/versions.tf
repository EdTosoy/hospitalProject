terraform {
  required_version = ">= 1.10, < 2.0"

  # Prepared only: bucket bootstrap and backend initialization require approval.
  # Backend credentials are independent of the provider's account enforcement.
  # Work only in an encrypted external directory: plans/error state remain local.
  backend "s3" {
    region              = "ap-southeast-1"
    profile             = "abox-747240980964"
    allowed_account_ids = ["747240980964"]
    key                 = "abox/aws-demo/terraform.tfstate"
    encrypt             = true
    use_lockfile        = true
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.56.0"
    }
  }
}

provider "aws" {
  region              = "ap-southeast-1"
  profile             = var.aws_profile
  allowed_account_ids = [var.expected_account_id]

  default_tags {
    tags = {
      Project = "abox-demo"
      Purpose = "synthetic-data-only"
    }
  }
}
