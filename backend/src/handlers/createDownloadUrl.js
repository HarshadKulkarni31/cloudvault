/**
 * createDownloadUrl.js — GET /download-url?key=uploads/...
 *
 * Validates the object key and generates a presigned GET URL.
 * The browser downloads directly from S3 — Lambda never streams the file.
 */

import { validateObjectKey } from '../utils/validation.js';
import { generatePresignedGetUrl, objectExists } from '../services/s3Service.js';
import { successResponse, errorResponse, internalError } from '../utils/response.js';
import { config } from '../utils/config.js';

export const handler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'unknown';
  console.log(`[createDownloadUrl] GET /download-url requestId=${requestId}`);

  // ── Extract key from query string ────────────────────────
  const key = event.queryStringParameters?.key;

  // ── Validate key ─────────────────────────────────────────
  const validation = validateObjectKey(key);
  if (!validation.valid) {
    console.log(`[createDownloadUrl] invalid key code=${validation.code} requestId=${requestId}`);
    return errorResponse(validation.code, validation.message);
  }

  // ── Verify object exists before issuing URL ───────────────
  let exists;
  try {
    exists = await objectExists(key);
  } catch (err) {
    return internalError(`existence check failed: ${err.message}`);
  }

  if (!exists) {
    return errorResponse('FILE_NOT_FOUND', 'The requested file does not exist.', 404);
  }

  // ── Generate presigned GET URL ───────────────────────────
  let downloadUrl;
  try {
    downloadUrl = await generatePresignedGetUrl(key);
  } catch (err) {
    return internalError(`presigned URL generation failed: ${err.message}`);
  }

  // Extract display name from key for logging (not the URL itself)
  const keyWithoutPrefix = key.replace(config.uploadsPrefix, '');
  const dashIndex = keyWithoutPrefix.indexOf('-');
  const displayName = dashIndex !== -1 ? keyWithoutPrefix.slice(dashIndex + 1) : keyWithoutPrefix;

  console.log(
    `[createDownloadUrl] success file=${displayName} requestId=${requestId}`
    // NOTE: never log the presigned URL itself
  );

  return successResponse({
    downloadUrl, // Short-lived presigned GET URL (S3 → browser direct)
    key,
    expiresIn: config.presignedUrlExpiry,
  });
};
