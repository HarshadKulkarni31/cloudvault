/**
 * createUploadUrl.js — POST /upload-url
 *
 * Validates the upload request, checks per-user quotas, and returns a
 * presigned PUT URL scoped to the authenticated user's S3 prefix.
 * The browser uploads the file DIRECTLY to S3 — Lambda never receives the file bytes.
 *
 * Request body: { fileName, contentType, fileSize }
 * Response:     { uploadUrl, key, expiresIn }
 */

import { randomUUID } from 'crypto';
import { validateUploadRequest, sanitizeFileName } from '../utils/validation.js';
import { checkQuota, generatePresignedPutUrl } from '../services/s3Service.js';
import { successResponse, errorResponse, internalError } from '../utils/response.js';
import { getUserId, getUserPrefix } from '../utils/auth.js';
import { config } from '../utils/config.js';

export const handler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'unknown';

  // ── Extract authenticated user identity ──────────────────
  let userId;
  try {
    userId = getUserId(event);
  } catch (err) {
    console.error(`[createUploadUrl] auth error requestId=${requestId}`, err.message);
    return internalError('auth claim extraction failed');
  }

  const userPrefix = getUserPrefix(userId, config.uploadsPrefix);
  console.log(`[createUploadUrl] POST /upload-url userId=${userId} requestId=${requestId}`);

  // ── Parse body ──────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return errorResponse('INVALID_REQUEST', 'Request body must be valid JSON.');
  }

  const { fileName, contentType, fileSize } = body;

  // ── Validate (Lambda re-validates — never trust client alone) ──
  const validation = validateUploadRequest({ fileName, contentType, fileSize });
  if (!validation.valid) {
    console.log(`[createUploadUrl] validation failed code=${validation.code} userId=${userId} requestId=${requestId}`);
    return errorResponse(validation.code, validation.message);
  }

  // ── Per-user quota check ─────────────────────────────────
  let quotaResult;
  try {
    quotaResult = await checkQuota(userPrefix, fileSize);
  } catch (err) {
    return internalError(`quota check failed: ${err.message}`);
  }

  if (!quotaResult.allowed) {
    console.log(`[createUploadUrl] quota exceeded code=${quotaResult.code} userId=${userId} requestId=${requestId}`);
    return errorResponse(quotaResult.code, quotaResult.reason, 429);
  }

  // ── Generate safe S3 key under the user's prefix ─────────
  const sanitized = sanitizeFileName(fileName);
  // Key format: uploads/{userId}/{uuid}-{sanitized-name}
  // The UUID is always 36 chars, so slice(37) reliably recovers the display name.
  const key = `${userPrefix}${randomUUID()}-${sanitized}`;

  // ── Generate presigned PUT URL ───────────────────────────
  let uploadUrl;
  try {
    uploadUrl = await generatePresignedPutUrl(key, contentType);
  } catch (err) {
    return internalError(`presigned URL generation failed: ${err.message}`);
  }

  console.log(
    `[createUploadUrl] success key=${key} size=${fileSize} type=${contentType} ` +
    `objects=${quotaResult.objectCount} userId=${userId} requestId=${requestId}`
    // NOTE: never log the presigned URL itself
  );

  return successResponse({
    uploadUrl,  // Short-lived presigned PUT URL (browser → S3 direct)
    key,
    expiresIn: config.presignedUrlExpiry,
  }, 201);
};
