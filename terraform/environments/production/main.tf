module "infra" {
  source      = "../../modules/base"
  environment = "production"
  vpc_cidr    = "10.30.0.0/16"
  subnet_cidrs = ["10.30.1.0/24", "10.30.2.0/24"]
  db_username = "app"
  db_password = "prod-secret"
  domain_name = "example.com"
  hosted_zone_id = "ZPROD123EXAMPLE"
}
