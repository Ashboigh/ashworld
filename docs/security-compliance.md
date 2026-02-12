## Security & Compliance Overview

### Data Security
- **Passwords & API keys** are hashed with Argon2id to protect credentials in rest.
- **Tokens** (OAuth, API keys, SSO states) are encrypted with AES-256-GCM via `DATA_ENCRYPTION_KEY` (falls back to `NEXTAUTH_SECRET`).
- **Transport**: TLS is enforced in Docker and production (CloudFront/ALB) with secure defaults.

### PII Detection & Redaction
- The `@/lib/compliance` helpers scan logs/messages for emails, phone numbers, SSNs, and credit-card patterns.
- Logging pipelines call `redactPII` before persisting, while UI views call `detectPII` to mask sensitive snippets if `isRedactionEnabled`.
- Preference toggles live in the organization settings so administrators can choose between redaction, masking, or opt-out storage.

### GDPR Controls
- Consent records are stored in `DataConsent` and exposed via `/api/compliance/consent`.
- Data subjects can request exports/deletions through `/api/organizations/:orgId/data-export` (not yet wired but stubbed).
- Privacy policy text is surfaced in the onboarding flow (see `apps/web/app/(dashboard)/[orgSlug]/settings/security`).

### HIPAA & PHI Handling
- Audit logs now include `is_phi`, `region`, and `incident_type` to trace BAA obligations.
- `QualityFlag` and `CompliancePolicy` models track PHI exposures via the review queue and compliance controls.
- Teams can capture PHI-specific workflow steps by toggling `phiHandling` in `CompliancePolicy`.

### SOC 2 Controls
- Access controls rely on `Permission` constants and `orgSlug` middleware.
- Incident response runbooks are documented under `docs/incidents.md` (create when ready) and tie into alerting (PagerDuty via Prometheus alerts).
- Security policies are surfaced through the admin UI with audit logging for each change.

### Data Retention & Residency
- `DataRetentionSchedule` drives periodic cleanup jobs (`scripts/data-retention.ts`), with configurable days for each resource.
- `CompliancePolicy.region` ensures data vaults align with US/EU/APAC residency; this value is propagated to Terraform tags (see `terraform/modules/base`).
- Automatic deletion jobs can be scheduled via cron or AWS EventBridge calling `pnpm run data-retention`.

### Monitoring & Alerting
- Prometheus+Grafana deployment (planned in `docs/observability.md`) collects metrics for service health.
- Loki/ELK centralizes logs, with Sentry capturing exceptions, and alerts wired to PagerDuty for incidents, especially around retention failures or PHI leaks.

### Next Steps
- Wire GDPR data export/delete endpoints and integrate consent toggles into the user-facing experience.
- Expand Terraform `CompliancePolicy` wiring to ACM-managed regions and data-lifecycle automation.
