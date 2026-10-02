# CloudVault

> **Near-zero-cost serverless file vault built on AWS S3, Lambda, and API Gateway.**

CloudVault lets you securely upload, list, download, and delete files stored in a private Amazon S3 bucket. It demonstrates production-level cloud engineering: presigned URLs, IAM least privilege, serverless architecture, infrastructure as code, and cost-aware design — all without an always-on server or database.

---

## Architecture

```
Browser (React + Vite)
  │
  │  HTTPS (metadata only)
  ▼
API Gateway HTTP API
  │
  ▼
AWS Lambda  ──── validate + authorise + generate presigned URL
                        │
                        ▼ returns short-lived URL to browser
Browser
  │
  │  Direct PUT / GET (file bytes — Lambda never sees them)
  ▼
Private Amazon S3
```

### Why serverless?

- **No idle cost** — Lambda and API Gateway charge per request only
- **No server management** — no OS patching, capacity planning, or uptime monitoring
- **Infinite burst** — scales automatically under unexpected load

### Why direct-to-S3 uploads?

- Lambda has a 6 MB payload limit; routing files through it is both costly and slow
- Presigned URLs delegate authorisation to the browser without exposing credentials
- Lambda runs for milliseconds to generate the URL, not for the entire file transfer

---

## AWS Services

| Service | Role |
|---|---|
| **Amazon S3** | Private object storage (SSE-S3 encryption, Block Public Access) |
| **AWS Lambda** | Serverless control plane — validates requests, generates presigned URLs |
| **API Gateway HTTP API** | HTTPS entry point (cheaper than REST API) |
| **AWS IAM** | Least-privilege Lambda execution role |
| **Amazon CloudWatch** | Operational logs (7-day retention) |
| **AWS SAM** | Infrastructure as code |

**Not used:** EC2, ECS, EKS, RDS, DynamoDB, NAT Gateway, CloudFront (optional V2), Cognito (optional V2).

---

## Cost-Control Architecture

| Guard | Detail |
|---|---|
| No always-on compute | Pure Lambda + S3 — pay per request |
| No provisioned Lambda | Cold starts acceptable for demo use |
| Max file size | 25 MB per file |
| Max object count | 100 files |
| Max total storage | 250 MB |
| Presigned URL lifetime | 5 minutes |
| Log retention | 7 days |
| No S3 versioning | Versioning multiplies stored-object count |
| No replication | Single-region only |
| Lifecycle rule | Incomplete multipart uploads cleaned up after 1 day |
| Optional expiration | Demo files expire after a configurable period (default 30 days) |

> **Disclaimer:** AWS costs cannot be guaranteed to be exactly \$0. Actual billing depends on region, free-tier status, usage volume, and AWS pricing at the time of use. Always check AWS Billing after deployment.

---

## Security Model

- S3 Block Public Access — all four flags enabled
- SSE-S3 (AES-256) encryption at rest on all objects
- Presigned URLs expire in 5 minutes
- Lambda key-prefix enforcement — all keys must start with `uploads/`
- Path traversal rejection — `..`, `//`, and absolute paths rejected
- Filename sanitisation — UUID prefix + alphanumeric characters only
- Double validation — client and Lambda both validate size, type, and key
- Least-privilege IAM — only 4 specific S3 actions, scoped to the CloudVault bucket
- No AWS credentials in frontend code — only `VITE_API_URL` is exposed
- CORS — specific origin only; no `*` wildcard in production
- CloudWatch logs never contain credentials, presigned URLs, or file contents
- `.env` files excluded from Git

> **Authentication note:** V1 does not include authentication. All files share the `uploads/` prefix. Treat V1 as a controlled demo, not a private multi-user storage service. V2 will add Amazon Cognito and per-user S3 prefixes.

---

## Features (V1)

- ✅ Upload via drag-and-drop or file picker
- ✅ Direct browser-to-S3 upload via presigned URL (Lambda never handles bytes)
- ✅ File list with name, size, and upload time
- ✅ Download via short-lived presigned URL
- ✅ Delete with confirmation dialog
- ✅ Client-side and Lambda-side validation (size, type, extension, key prefix)
- ✅ Quota enforcement (object count + total storage)
- ✅ Search by filename (client-side)
- ✅ Sort by name, size, newest, oldest
- ✅ Upload progress bar
- ✅ Storage quota meter (dual bar: bytes + object count)
- ✅ Toast notifications
- ✅ Empty, loading, and error states
- ✅ Responsive: table on desktop, cards on mobile
- ✅ CloudWatch operational logs (7-day retention)
- ✅ Health endpoint (`GET /health`)

---

## Project Structure

```
cloudvault/
├── frontend/                   # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/         # UI components
│   │   ├── services/api.js     # API + S3 upload service
│   │   └── utils/              # formatFileSize, formatDate
│   └── .env.example            # Copy to .env.local; never commit secrets
├── backend/                    # Node.js Lambda handlers
│   └── src/
│       ├── handlers/           # health, listFiles, createUploadUrl, createDownloadUrl, deleteFile
│       ├── services/s3Service.js
│       └── utils/              # config, validation, response
├── infrastructure/
│   └── template.yaml           # AWS SAM template
├── docs/
│   └── architecture.md
└── README.md
```

---

## Local Setup

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) — configured on your machine only
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Deploy the backend to AWS

```bash
cd infrastructure
sam build
sam deploy --guided
```

During `sam deploy --guided`, you will be prompted for:

| Parameter | Default | Notes |
|---|---|---|
| `ProjectName` | `cloudvault` | Used in resource names |
| `AllowedOrigin` | `http://localhost:5173` | Change to your frontend URL for production |
| `MaxFileSizeMB` | `25` | |
| `MaxObjectCount` | `100` | |
| `MaxStorageMB` | `250` | |
| `PresignedUrlExpirySeconds` | `300` | |
| `LogRetentionDays` | `7` | |
| `DemoRetentionDays` | `30` | Set to 0 to disable auto-expiration |

Copy the `ApiBaseUrl` output value.

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local and set:
# VITE_API_URL=https://YOUR_API_GATEWAY_ID.execute-api.REGION.amazonaws.com/v1
```

### 4. Run the frontend locally

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## AWS Deployment (Frontend)

Build the frontend and deploy to S3 static hosting:

```bash
cd frontend
npm run build
# dist/ folder is ready

# Create a static hosting S3 bucket (separate from the storage bucket)
aws s3 mb s3://cloudvault-frontend-YOURNAME --region YOUR_REGION
aws s3 website s3://cloudvault-frontend-YOURNAME --index-document index.html
aws s3 sync dist/ s3://cloudvault-frontend-YOURNAME --delete

# Update AllowedOrigin in SAM to your frontend URL, then redeploy:
sam deploy --parameter-overrides AllowedOrigin=http://cloudvault-frontend-YOURNAME.s3-website-REGION.amazonaws.com
```

> CloudFront is optional (V2 feature). Not required for V1.

---

## API Documentation

Base URL: `https://<api-id>.execute-api.<region>.amazonaws.com/v1`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/files` | List all files with metadata |
| `POST` | `/upload-url` | Request a presigned S3 PUT URL |
| `GET` | `/download-url?key=uploads/…` | Request a presigned S3 GET URL |
| `DELETE` | `/files/{key}` | Delete a file |

### POST /upload-url

**Request:**
```json
{
  "fileName": "resume.pdf",
  "contentType": "application/pdf",
  "fileSize": 125430
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/...",
    "key": "uploads/uuid-resume.pdf",
    "expiresIn": 300
  }
}
```

### Error format
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds the 25 MB limit."
  }
}
```

**Error codes:** `INVALID_REQUEST`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `QUOTA_EXCEEDED`, `FILE_NOT_FOUND`, `INVALID_FILE_KEY`, `UPLOAD_FAILED`, `DOWNLOAD_FAILED`, `DELETE_FAILED`, `INTERNAL_ERROR`

---

## Environment Variables

### Frontend (`frontend/.env.local` — gitignored)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | API Gateway base URL from SAM output |

### Backend (set by SAM template — never hardcoded)

| Variable | Default | Description |
|----------|---------|-------------|
| `BUCKET_NAME` | — | S3 bucket name (from SAM) |
| `MAX_FILE_SIZE_MB` | `25` | Maximum file size in MB |
| `MAX_OBJECT_COUNT` | `100` | Maximum number of objects |
| `MAX_STORAGE_MB` | `250` | Maximum total storage in MB |
| `PRESIGNED_URL_EXPIRY` | `300` | Presigned URL lifetime in seconds |
| `UPLOADS_PREFIX` | `uploads/` | S3 key prefix |

---

## Testing Checklist

| Test | Expected result |
|------|-----------------|
| Upload valid PDF (< 25 MB) | Succeeds, appears in file list |
| Upload file > 25 MB | Rejected with `FILE_TOO_LARGE` |
| Upload unsupported type (e.g. `.exe`) | Rejected with `UNSUPPORTED_FILE_TYPE` |
| List files | Returns stored objects with metadata |
| Download file | Opens presigned URL; file downloads from S3 |
| Expired presigned URL | Download fails with 403 from S3 |
| Delete file | File removed; list refreshes |
| Direct S3 access (no presigned URL) | 403 Access Denied |
| Invalid object key (path traversal) | Rejected with `INVALID_FILE_KEY` |
| Quota exceeded | Upload URL not issued, `QUOTA_EXCEEDED` error |
| API unavailable | Friendly error state in UI |
| No AWS credentials in frontend | ✅ Only `VITE_API_URL` in env |
| CloudWatch logs available | ✅ Operational logs in /aws/lambda/ groups |

---

## Cost Monitoring & Cleanup

### After deployment

1. Open **AWS Billing > Cost Management** and check actual charges
2. Create an **AWS Budget alert** (Billing → Budgets → Create budget)
   - Set a small monthly notification threshold (e.g. $5)
   - Note: budget alerts are notifications, not hard caps
3. Check S3 object count periodically: `aws s3 ls s3://YOUR_BUCKET/uploads/ --recursive | wc -l`
4. Delete unused test resources after development

### Cleanup (tear down everything)

```bash
# Delete all objects in the storage bucket first (required before stack deletion)
aws s3 rm s3://cloudvault-ACCOUNTID-REGION --recursive

# Delete the SAM stack
sam delete --stack-name cloudvault
```

> Always verify the AWS Billing dashboard after deployment. The free tier covers most demo usage, but charges can accumulate with heavy use.

---

## Known Limitations (V1)

- No authentication — all files share the `uploads/` prefix (shared demo namespace)
- No per-user isolation — V1 is a controlled demo, not production multi-user storage
- No file versioning
- No folder hierarchy
- No real-time updates (refresh on user actions only)
- Client-side search/sort only (sufficient for ≤ 100 objects)
- No virus scanning

## Future Improvements (V2)

- Amazon Cognito authentication with per-user S3 prefixes
- Folder support
- Trash/recycle bin
- File sharing with configurable expiry
- CloudFront for global CDN delivery
- File preview (images, PDFs)
- Activity audit trail
- Virus scanning pipeline

---

## License

MIT
