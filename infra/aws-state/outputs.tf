output "state_bucket" {
  description = "Bucket name for the application and separately approved bootstrap backend migration."
  value       = aws_s3_bucket.state.id
}

output "state_client_policy_arns" {
  description = "Unattached policies, separated by root. Role selection/attachment requires separate approval."
  value       = { for key, policy in aws_iam_policy.state_client : key => policy.arn }
}
