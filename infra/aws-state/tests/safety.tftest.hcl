# Plan-only mocked tests. No AWS client, backend access, or real resources.
mock_provider "aws" {
  override_during = plan
  mock_resource "aws_s3_bucket" {
    defaults = {
      id  = "abox-state-offline-test"
      arn = "arn:aws:s3:::abox-state-offline-test"
    }
  }
}

run "encrypted_private_versioned_state" {
  command = plan

  assert {
    condition = (
      aws_s3_bucket_public_access_block.state.block_public_acls &&
      aws_s3_bucket_public_access_block.state.block_public_policy &&
      aws_s3_bucket_public_access_block.state.ignore_public_acls &&
      aws_s3_bucket_public_access_block.state.restrict_public_buckets
    )
    error_message = "All public access blocks must be enabled."
  }
  assert {
    condition     = one(aws_s3_bucket_versioning.state.versioning_configuration).status == "Enabled"
    error_message = "State versioning must remain enabled."
  }
  assert {
    condition     = one(one(aws_s3_bucket_server_side_encryption_configuration.state.rule).apply_server_side_encryption_by_default).sse_algorithm == "AES256"
    error_message = "State must use SSE-S3."
  }
  assert {
    condition     = !aws_s3_bucket.state.force_destroy && one(aws_s3_bucket_ownership_controls.state.rule).object_ownership == "BucketOwnerEnforced"
    error_message = "Do not destroy nonempty state or enable ACL ownership."
  }
}

run "transport_and_account_denials" {
  command = plan

  assert {
    condition = alltrue([
      for statement in jsondecode(aws_s3_bucket_policy.state.policy).Statement :
      statement.Effect == "Deny" && statement.Principal == "*"
    ])
    error_message = "Bucket policy must only enforce denials, not grant broad access."
  }
  assert {
    condition = (
      jsondecode(aws_s3_bucket_policy.state.policy).Statement[0].Condition.Bool["aws:SecureTransport"] == "false" &&
      jsondecode(aws_s3_bucket_policy.state.policy).Statement[1].Condition.StringNotEquals["aws:PrincipalAccount"] == "747240980964" &&
      jsondecode(aws_s3_bucket_policy.state.policy).Statement[2].Condition.StringNotEquals["s3:x-amz-server-side-encryption"] == "AES256"
    )
    error_message = "TLS, same-account and explicit SSE-S3 must be enforced."
  }
}

run "separate_scoped_state_and_lock_permissions" {
  command = plan

  assert {
    condition = alltrue([
      for name, key in local.state_keys :
      jsondecode(aws_iam_policy.state_client[name].policy).Statement[1].Action == ["s3:GetObject", "s3:PutObject"] &&
      jsondecode(aws_iam_policy.state_client[name].policy).Statement[1].Resource == "arn:aws:s3:::abox-state-offline-test/${key}" &&
      jsondecode(aws_iam_policy.state_client[name].policy).Statement[2].Action == ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"] &&
      jsondecode(aws_iam_policy.state_client[name].policy).Statement[2].Resource == "arn:aws:s3:::abox-state-offline-test/${key}.tflock"
    ])
    error_message = "State deletion must never be granted; delete only the matching lockfile."
  }
  assert {
    condition = alltrue([
      for name, key in local.state_keys :
      length(jsondecode(aws_iam_policy.state_client[name].policy).Statement) == 3 &&
      jsondecode(aws_iam_policy.state_client[name].policy).Statement[0].Action == "s3:ListBucket" &&
      jsondecode(aws_iam_policy.state_client[name].policy).Statement[0].Condition.StringEquals["s3:prefix"] == [key, "${key}.tflock"]
    ])
    error_message = "Listing must be scoped, with no bucket/version administration grants."
  }
}
