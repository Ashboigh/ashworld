### Networking ###
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = {
    Name        = "${var.environment}-vpc"
    environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count             = length(var.subnet_cidrs)
  cidr_block        = var.subnet_cidrs[count.index]
  vpc_id            = aws_vpc.main.id
  availability_zone = data.aws_availability_zones.available.names[count.index % length(data.aws_availability_zones.available.names)]
  tags = {
    Name        = "${var.environment}-subnet-${count.index}"
    environment = var.environment
  }
}

resource "aws_security_group" "web" {
  name_prefix = "${var.environment}-web-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    environment = var.environment
  }
}

data "aws_availability_zones" "available" {}

### Database ###
resource "aws_db_subnet_group" "db" {
  name       = "${var.environment}-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.environment}-postgres"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t4g.micro"
  username          = var.db_username
  password          = var.db_password
  allocated_storage = 20
  vpc_security_group_ids = [aws_security_group.web.id]
  db_subnet_group_name   = aws_db_subnet_group.db.name
  skip_final_snapshot    = true

  tags = {
    environment = var.environment
  }
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.environment}-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.web.id]
  parameter_group_name = "default.redis7"
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.environment}-redis"
  subnet_ids = aws_subnet.private[*].id
}

### Storage ###
resource "aws_s3_bucket" "chat_assets" {
  bucket = "${var.environment}-chat-assets"
  acl    = "private"
  versioning {
    enabled = true
  }

  tags = {
    environment = var.environment
  }
}

### CDN ###
resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for ${var.environment} web assets"
}

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"
  origins {
    domain_name = aws_s3_bucket.chat_assets.bucket_regional_domain_name
    origin_id   = "s3-${aws_s3_bucket.chat_assets.id}"
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-${aws_s3_bucket.chat_assets.id}"
    viewer_protocol_policy = "redirect-to-https"
    forwarded_values {
      query_string = false
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

### Compute ###
resource "aws_ecs_cluster" "app" {
  name = "${var.environment}-ecs"
}

resource "aws_lb" "alb" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.private[*].id
}

resource "aws_acm_certificate" "cert" {
  domain_name       = var.domain_name
  validation_method = "DNS"
}

resource "aws_route53_record" "app" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  alias {
    name                   = aws_lb.alb.dns_name
    zone_id                = aws_lb.alb.zone_id
    evaluate_target_health = true
  }
}

### Compliance tags ###
resource "null_resource" "compliance_tags" {
  lifecycle {
    create_before_destroy = true
  }
  triggers = {
    environment = var.environment
    compliance  = "SOC2,GDPR,HIPAA"
  }
}
