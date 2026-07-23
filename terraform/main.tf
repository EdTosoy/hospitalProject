
resource "aws_vpc" "hospital_project" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "hospital_project_vpc"
  }
}
