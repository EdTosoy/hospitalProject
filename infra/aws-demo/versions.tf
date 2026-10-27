terraform {
  required_version = ">= 1.10, < 2.0"

  # Phase 3B: initialize with an absolute path on operator-controlled encrypted
  # storage outside this repository. Phase 3A uses init -backend=false only.
  backend "local" {}

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
