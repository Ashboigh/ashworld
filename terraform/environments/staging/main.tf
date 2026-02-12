module "infra" {
  source      = "../../modules/base"
  environment = "staging"
  vpc_cidr    = "10.20.0.0/16"
  subnet_cidrs = ["10.20.1.0/24", "10.20.2.0/24"]
  db_username = "app"
  db_password = "staging-secret"
  domain_name = "staging.example.com"
  hosted_zone_id = "ZSTAGE123EXAMPLE"
}
