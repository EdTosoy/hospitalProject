data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

data "aws_ami" "al2023_arm64" {
  owners = ["amazon"]
  filter {
    name   = "image-id"
    values = [data.aws_ssm_parameter.al2023_arm64.value]
  }
  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

data "aws_ec2_instance_type_offerings" "t4g_small" {
  location_type = "availability-zone"
  filter {
    name   = "instance-type"
    values = ["t4g.small"]
  }
}

resource "aws_vpc" "demo" {
  cidr_block           = "10.42.0.0/24"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "abox-demo" }
}

resource "aws_internet_gateway" "demo" {
  vpc_id = aws_vpc.demo.id
}

resource "aws_subnet" "demo" {
  vpc_id                  = aws_vpc.demo.id
  cidr_block              = "10.42.0.0/26"
  availability_zone       = sort(data.aws_ec2_instance_type_offerings.t4g_small.locations)[0]
  map_public_ip_on_launch = false
}

resource "aws_route_table" "demo" {
  vpc_id = aws_vpc.demo.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.demo.id
  }
}

resource "aws_route_table_association" "demo" {
  subnet_id      = aws_subnet.demo.id
  route_table_id = aws_route_table.demo.id
}

resource "aws_security_group" "web" {
  name_prefix = "abox-demo-"
  description = "Only Caddy HTTP/HTTPS ingress; no SSH, application, database or admin ports."
  vpc_id      = aws_vpc.demo.id
}

resource "aws_vpc_security_group_ingress_rule" "web" {
  for_each          = toset(["80", "443"])
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = tonumber(each.value)
  to_port           = tonumber(each.value)
}

resource "aws_vpc_security_group_egress_rule" "https" {
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "dns" {
  for_each          = toset(["tcp", "udp"])
  security_group_id = aws_security_group.web.id
  cidr_ipv4         = aws_vpc.demo.cidr_block
  ip_protocol       = each.value
  from_port         = 53
  to_port           = 53
}

resource "aws_instance" "demo" {
  ami                                  = data.aws_ami.al2023_arm64.id
  instance_type                        = "t4g.small"
  subnet_id                            = aws_subnet.demo.id
  vpc_security_group_ids               = [aws_security_group.web.id]
  associate_public_ip_address          = true
  iam_instance_profile                 = aws_iam_instance_profile.demo.name
  monitoring                           = false
  instance_initiated_shutdown_behavior = "stop"

  credit_specification {
    cpu_credits = "standard"
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    iops                  = 3000
    throughput            = 125
    encrypted             = true
    delete_on_termination = true
  }

  # No passwords, access keys, application env files, or image-pull credentials.
  # No applications start automatically; an operator releases them over SSM.
  user_data                   = file("${path.module}/user-data.sh")
  user_data_replace_on_change = true
  tags = {
    Name        = "abox-demo"
    DemoEndDate = var.demo_end_date
  }
  depends_on = [aws_route_table_association.demo, aws_iam_role_policy.runtime]
}

resource "aws_s3_bucket" "backups" {
  bucket        = "abox-demo-backups-${var.expected_account_id}-${var.backup_bucket_suffix}"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "seven-day-demo-retention"
    status = "Enabled"
    filter { prefix = "demo/" }
    expiration { days = 7 }
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }
}

resource "aws_s3_bucket_policy" "backups" {
  bucket = aws_s3_bucket.backups.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyPlainHTTP", Effect = "Deny", Principal = "*", Action = "s3:*"
        Resource  = [aws_s3_bucket.backups.arn, "${aws_s3_bucket.backups.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "RequireExplicitEncryption", Effect = "Deny", Principal = "*", Action = "s3:PutObject"
        Resource  = "${aws_s3_bucket.backups.arn}/*"
        Condition = { StringNotEquals = { "s3:x-amz-server-side-encryption" = "AES256" } }
      }
    ]
  })
}
