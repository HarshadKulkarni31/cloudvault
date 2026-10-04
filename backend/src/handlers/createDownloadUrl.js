/**
 * createDownloadUrl.js — GET /download-url?key=uploads/{userId}/...
 *
 * Validates the object key, verifies it belongs to the authenticated user,
 * and generates a presigned GET URL.
 * The browser downloads directly from S3 — Lambda never streams the file.
 */

import { validateObjectKey } from '../utils/validation.js';
import { generatePresignedGetUrl, objectExists } from '../services/s3Service.js';
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
    console.error(`[createDownloadUrl] auth error requestId=${requestId}`, err.message);
    return internalError('auth claim extraction failed');
  }

  const userPrefix = getUserPrefix(userId, config.uploadsPrefix);
  console.log(`[createDownloadUrl] GET /download-url userId=${userId} requestId=${requestId}`);

  // ── Extract key from query string ────────────────────────
  const key = event.queryStringParameters?.key;

  // ── Validate key ─────────────────────────────────────────
  const validation = validateObjectKey(key);
  if (!validation.valid) {
    console.log(`[createDownloadUrl] invalid key code=${validation.code} userId=${userId} requestId=${requestId}`);
    return errorResponse(validation.code, validation.message);
  }

  // ── Ownership check — key must belong to this user ───────
  // This prevents user A from downloading user B's files by guessing their key.
  if (!key.startsWith(userPrefix)) {
    console.log(`[createDownloadUrl] ownership violation userId=${userId} key=${key} requestId=${requestId}`);
    return errorResponse('INVALID_FILE_KEY', 'You do not have access to this file.', 403);
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

  // Extract display name for logging (not the URL itself)
  const keyWithoutPrefix = key.slice(userPrefix.length);
  const displayName = keyWithoutPrefix.length > 37 ? keyWithoutPrefix.slice(37) : keyWithoutPrefix;

  console.log(
    `[createDownloadUrl] success file=${displayName} userId=${userId} requestId=${requestId}`
    // NOTE: never log the presigned URL itself
  );

  return successResponse({
    downloadUrl, // Short-lived presigned GET URL (S3 → browser direct)
    key,
    expiresIn: config.presignedUrlExpiry,
  });
};
