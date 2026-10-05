# CloudVault

> **Near-zero-cost serverless private file vault on AWS S3, Lambda, API Gateway, and Cognito.**

Upload, list, download, and delete files stored in a private Amazon S3 bucket with per-user isolation, direct-to-S3 uploads via presigned URLs, and Google OAuth authentication.

---

## Architecture

```
Browser (React + Vite)
  │  1. Authenticate with Google (Cognito Hosted UI)
  │  2. Request presigned URL (API Gateway + JWT Authorizer)
  ▼
AWS Lambda ──── Validate user identity (JWT) & enforce quotas
  │
  ▼ Returns short-lived presigned PUT/GET URL
Browser ────── Direct file transfer (bytes bypass Lambda completely) ──────▶ Private S3
```

- **Direct Uploads**: Lambda never handles file bytes (no 6MB limits or execution timeouts).
- **Per-User Isolation**: Files are scoped to `uploads/{userId}/` using the Cognito `sub` claim.
- **Cost Guardrails**: Max 25 MB/file, 100 files, 250 MB total quota per user, 5-minute URL lifetime.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons
- **Backend**: Node.js 20, AWS SDK v3, AWS Lambda (arm64 Graviton2)
- **Auth**: AWS Cognito User Pool with Google Identity Provider (PKCE OAuth flow)
- **Infra**: AWS SAM (API Gateway HTTP API, S3, IAM, CloudWatch)

---

## Quickstart

### 1. Prerequisites
- Node.js 20+
- AWS CLI & AWS SAM CLI configured
- Google OAuth 2.0 Client credentials (from [Google Cloud Console](https://console.cloud.google.com/))

### 2. Backend Deployment

1. Configure parameters:
   ```bash
   cp infrastructure/samconfig.toml.example infrastructure/samconfig.toml
   ```
   Add your `GoogleClientId` and `GoogleClientSecret` into `infrastructure/samconfig.toml`.

2. Add the Cognito redirect URI to your Google OAuth client in Google Cloud Console:
   ```text
   https://<CognitoDomainPrefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```

3. Build and deploy:
   ```bash
   cd infrastructure
   sam build
   sam deploy
   ```
   Note the `ApiBaseUrl`, `CognitoHostedUiDomain`, and `CognitoClientId` outputs.

### 3. Frontend Setup

1. Configure environment:
   ```bash
   cd ../frontend
   cp .env.example .env.local
   ```
   Populate `.env.local` with the values output from `sam deploy`:
   ```env
   VITE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com/v1
   VITE_COGNITO_DOMAIN=https://<prefix>.auth.<region>.amazoncognito.com
   VITE_COGNITO_CLIENT_ID=<client-id>
   ```

2. Run the development server:
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:5173`.

---

## API Overview

Base URL: `https://<api-id>.execute-api.<region>.amazonaws.com/v1`  
*(All endpoints except `/health` require `Authorization: Bearer <ID_TOKEN>`)*

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Service liveness check (public) |
| `GET` | `/files` | List user's files and quota usage |
| `POST` | `/upload-url` | Generate presigned S3 PUT URL |
| `GET` | `/download-url?key=...` | Generate presigned S3 GET URL |
| `DELETE` | `/files/{key+}` | Delete an owned file from S3 |

---

## Teardown

```bash
# Empty the storage bucket before deleting the stack
aws s3 rm s3://<bucket-name> --recursive

# Delete AWS resources
cd infrastructure
sam delete --stack-name cloudvault
```

---

## License

MIT
