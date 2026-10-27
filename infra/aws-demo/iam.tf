resource "aws_iam_role" "runtime" {
  name_prefix = "abox-demo-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "runtime" {
  role = aws_iam_role.runtime.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SSMRegistration", Effect = "Allow"
        Action = ["ssm:UpdateInstanceInformation"], Resource = "*"
      },
      {
        Sid      = "SSMSessionChannels", Effect = "Allow"
        Action   = ["ssmmessages:CreateControlChannel", "ssmmessages:CreateDataChannel", "ssmmessages:OpenControlChannel", "ssmmessages:OpenDataChannel"]
        Resource = "*"
      },
      {
        Sid      = "DemoBackupObjects", Effect = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.backups.arn}/demo/*"
      },
      {
        Sid       = "ListDemoBackups", Effect = "Allow"
        Action    = ["s3:ListBucket"], Resource = aws_s3_bucket.backups.arn
        Condition = { StringLike = { "s3:prefix" = ["demo/", "demo/*"] } }
      }
    ]
  })
}

resource "aws_iam_instance_profile" "demo" {
  name_prefix = "abox-demo-"
  role        = aws_iam_role.runtime.name
}
