variable "region" {
  type        = string
  description = "Target AWS region for the deployment."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)."
}
