# Architecture — CloudVault

## Overview

CloudVault uses a **serverless control-plane / S3 data-plane** split:

```
Browser
  │
  │  1. API requests (metadata only)
  ▼
API Gateway HTTP API  ──► AWS Lambda (validate + generate presigned URL)
                                │
                                │  2. Return short-lived presigned URL
                                ▼
                            Browser
                                │
                                │  3. Direct PUT/GET (file bytes)
                                ▼
                        Private Amazon S3
```

## Why direct-to-S3 transfers?

- Lambda has a 6 MB (sync) / 20 MB (async) payload limit
- Routing file bytes through Lambda wastes compute, adds latency, and costs more
- S3 presigned URLs delegate authorisation to the browser without exposing credentials
- Lambda only runs for milliseconds to generate the URL, not for the entire transfer

## IAM Least Privilege

The Lambda execution role grants **only** these S3 actions, scoped to the CloudVault bucket:

| Action | Reason |
|--------|--------|
| `s3:ListBucket` | List files for GET /files and quota check |
| `s3:GetObject` | Generate presigned GET URLs + HeadObject |
| `s3:PutObject` | Generate presigned PUT URLs |
| `s3:DeleteObject` | DELETE /files/{key} |

No `s3:*` wildcard. No `AdministratorAccess`. No user access keys created.

## Cost Architecture

| What we DON'T use | Why |
|---|---|
| EC2 / ECS / EKS | Always-on compute = always-on cost |
| RDS / DynamoDB | No database needed for ≤100 objects |
| NAT Gateway | Not needed — Lambda in public subnets by default |
| CloudFront | Optional in V2 |
| Lambda provisioned concurrency | Pay-per-use only |
| S3 versioning / replication | Multiplies stored objects |

## Security Model

- S3 Block Public Access: all four flags enabled
- SSE-S3 (AES-256) encryption at rest
- Presigned URLs expire after 5 minutes
- Key-prefix enforcement in Lambda: all keys must start with `uploads/`
- Path traversal patterns rejected (`..`, `//`, absolute paths)
- CORS: specific origin only (no `*` in production)
- No AWS credentials in frontend code
- CloudWatch logs never contain presigned URLs, credentials, or file contents

## V1 Limitations

- No authentication — all users share the `uploads/` namespace
- V1 is a controlled demo; do not use for private multi-user storage
- No file versioning
- No folder hierarchy
- No real-time updates

## V2 Roadmap

- Amazon Cognito authentication
- Per-user S3 prefixes (`users/{userId}/uploads/`)
- Folders, trash, file sharing
- CloudFront for global CDN delivery
- Virus scanning pipeline
- Activity audit trail
