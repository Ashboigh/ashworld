# Terraform infrastructure overview

- **Purpose**: Provision AWS networking, compute, storage, and load balancing for dev, staging, and production.
- **Modules**: `terraform/modules/base` defines shared VPC, RDS, ElastiCache, S3, CloudFront, ECS/EKS, ALB, Route53, and ACM resources.
- **Environments**: Individual directories (`terraform/environments/dev`, `staging`, `prod`) instantiate the base module with environment-specific CIDRs, instance sizes, and retention policies.
- **Workflow**:
  1. `cd terraform/environments/dev`
  2. `terraform init`
  3. `terraform plan -var-file=dev.tfvars`
  4. `terraform apply`

- **Compliance hooks**: The module emits tags for Security/HIPAA and allows configuration of data residency and retention durations for automated deletion.
