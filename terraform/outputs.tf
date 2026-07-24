output "instance_public_ip" {
  value = aws_instance.main.public_ip
}

output "backend_ecr_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}
