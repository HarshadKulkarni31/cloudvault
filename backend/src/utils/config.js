/**
 * config.js — Centralised environment configuration
 * All values come from Lambda environment variables set by SAM template.
 * No hardcoded credentials or secrets.
 */

export const config = {
  bucketName: process.env.BUCKET_NAME,
  region: process.env.AWS_REGION || 'us-east-1',

  // Storage guardrails
  maxFileSizeBytes: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25) * 1024 * 1024,
  maxObjectCount: parseInt(process.env.MAX_OBJECT_COUNT, 10) || 100,
  maxStorageBytes: (parseInt(process.env.MAX_STORAGE_MB, 10) || 250) * 1024 * 1024,

  // Presigned URL lifetime
  presignedUrlExpiry: parseInt(process.env.PRESIGNED_URL_EXPIRY, 10) || 300,

  // S3 key prefix — all objects must live under this prefix
  uploadsPrefix: process.env.UPLOADS_PREFIX || 'uploads/',

  // Allowed content types (allowlist approach)
  allowedContentTypes: new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed',
  ]),

  // Allowed extensions (secondary check alongside content type)
  allowedExtensions: new Set([
    'pdf', 'doc', 'docx', 'txt', 'csv',
    'xls', 'xlsx', 'ppt', 'pptx',
    'jpg', 'jpeg', 'png', 'gif', 'zip',
  ]),
};
