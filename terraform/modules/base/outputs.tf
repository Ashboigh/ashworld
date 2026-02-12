output "vpc_id" {
  value = aws_vpc.main.id
}

output "alb_dns" {
  value = aws_lb.alb.dns_name
}

output "bucket_name" {
  value = aws_s3_bucket.chat_assets.id
}
