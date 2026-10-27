output "instance_id" {
  value = aws_instance.demo.id
}

output "public_ipv4" {
  description = "Set both demo A records to this address. Stop/start changes it; no Elastic IP is allocated."
  value       = aws_instance.demo.public_ip
}

output "backup_bucket" {
  value     = aws_s3_bucket.backups.id
  sensitive = true
}

output "instance_role_arn" {
  value     = aws_iam_role.runtime.arn
  sensitive = true
}
