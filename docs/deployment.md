## Deployment infrastructure

### Docker + Compose
- `Dockerfile` uses a multi-stage build to compile the Next.js `apps/web` project and ship only the production stdout.
- `docker-compose.yml` provisions Postgres (with pgvector), Redis, and the web service so you can run `docker compose up --build`.

### GitHub Actions (CI/CD)
- `ci-pr.yml`: On PRs against `main`, runs lint, test, build, and a preview-deploy placeholder.
- `main.yml`: On merges to `main`, reruns lint/build, simulates staging deployment, and runs placeholder E2E smoke tests.
- `release.yml`: Triggered on GitHub release publishes and orchestrates production deployment + smoke validation jobs.

### Terraform (AWS)
- `terraform/modules/base` describes VPC, RDS/ElastiCache, S3 + CloudFront, ECS/ALB, ACM, and Route53 for US/EU/APAC resiliency.
- Environment folders (`terraform/environments/dev|staging|production`) instantiate `base` with tailored CIDRs, domains, and credentials.
- Compliance tags emit SOC 2/GDPR/HIPAA metadata; retention/residency config is stored in `CompliancePolicy`.

### Monitoring & Scaling
- Prometheus + Grafana (deployed via your monitoring stack) scrape `/metrics`; logs funnel to Loki/ELK; Sentry captures runtime errors.
- Alert rules map to PagerDuty for incidents (e.g., retention job failure, HIPAA alert, high error rate).
- Scaling is handled by ECS autoscaling policies, additional read replicas for RDS, connection pooling (PGBouncer), and CloudFront caching of widgets.

### Next steps
1. Wire the Terraform modules to full AWS accounts (VPC peering, NAT, KMS for encryption).
2. Replace the placeholder deploy/test steps in GitHub Actions with real scripts (Preview branches, Terraform apply, Helm chart deploys).
3. Expand monitoring dashboards and tie alerting into PagerDuty/Sentry for runbooks.
