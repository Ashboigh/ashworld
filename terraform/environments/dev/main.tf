module "infra" {
  source      = "../../modules/base"
  environment = "dev"
  vpc_cidr    = "10.10.0.0/16"
  subnet_cidrs = ["10.10.1.0/24", "10.10.2.0/24"]
  db_username = "app"
  db_password = "dev-password"
  domain_name = "dev.example.com"
  hosted_zone_id = "ZDEV123EXAMPLE"
}
