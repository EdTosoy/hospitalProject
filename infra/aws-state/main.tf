locals {
  # Separate client policies avoid granting application operators bootstrap access.
  state_keys = {
    application = "abox/aws-demo/terraform.tfstate"
    bootstrap   = "abox/bootstrap/terraform.tfstate"
  }
}

resource "aws_s3_bucket" "state" {
  bucket_prefix = "abox-tfstate-747240980964-"
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "DenyOtherAccounts"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
        Condition = { StringNotEquals = { "aws:PrincipalAccount" = "747240980964" } }
      },
      {
        Sid       = "RequireExplicitSSES3"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.state.arn}/*"
        Condition = { StringNotEquals = { "s3:x-amz-server-side-encryption" = "AES256" } }
      }
    ]
  })

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_iam_policy" "state_client" {
  for_each    = local.state_keys
  name_prefix = "abox-state-${each.key}-"
  description = "Backend-only access to one abox state key and its native S3 lock. Unattached."
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListStateAndLock"
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = aws_s3_bucket.state.arn
        Condition = {
          StringEquals = { "s3:prefix" = [each.value, "${each.value}.tflock"] }
        }
      },
      {
        Sid      = "ReadWriteState"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "${aws_s3_bucket.state.arn}/${each.value}"
      },
      {
        Sid      = "ManageNativeLock"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.state.arn}/${each.value}.tflock"
      }
    ]
  })
}
