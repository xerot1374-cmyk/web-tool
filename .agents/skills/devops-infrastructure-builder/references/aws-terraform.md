# AWS Terraform track

Use this track when the user wants concrete cloud deployment on AWS.

Default services:
- VPC and subnets
- ECS Fargate or App Runner for containerized apps
- RDS PostgreSQL
- ECR for images
- S3 + CloudFront for web delivery if static hosting is chosen
- Secrets Manager or SSM Parameter Store for secrets/config

Configuration rules:
- Keep account IDs, regions, bucket names, database identifiers, domain names, image references, and similar deployment values out of hardcoded Terraform defaults when they are environment-specific.
- Document required Terraform-facing variables in `.env.example` and make the infrastructure workflow load them explicitly before plan/apply steps.
- Use safe placeholders in `.env.example`, not live environment values.

Terraform layout:

```text
infra/terraform/aws/
  modules/
  environments/
```

Separate reusable modules from environment composition.
