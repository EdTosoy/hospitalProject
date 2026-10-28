terraform {
  required_version = ">= 1.10, < 2.0"

  # Bootstrap ONLY from a verified encrypted external working directory.
  # After bucket verification and explicit migration approval, activate the
  # supplied backend_override.tf.example in that encrypted directory.
  backend "local" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.56.0"
    }
  }
}

provider "aws" {
  region              = "ap-southeast-2"
  profile             = "abox-747240980964"
  allowed_account_ids = ["747240980964"]

  default_tags {
    tags = {
      Project = "abox"
      Purpose = "terraform-state"
    }
  }
}
