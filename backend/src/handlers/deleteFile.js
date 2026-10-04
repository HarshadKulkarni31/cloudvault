/**
 * deleteFile.js — DELETE /files/{key+}
 *
 * Validates the key, verifies ownership (key must belong to the authenticated
 * user), verifies the object exists, and deletes it from S3.
 */

import { validateObjectKey } from '../utils/validation.js';
import { objectExists, deleteFile } from '../services/s3Service.js';
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
    console.error(`[deleteFile] auth error requestId=${requestId}`, err.message);
    return internalError('auth claim extraction failed');
  }

  const userPrefix = getUserPrefix(userId, config.uploadsPrefix);
  console.log(`[deleteFile] DELETE /files userId=${userId} requestId=${requestId}`);

  // ── Extract key from path parameters ────────────────────
  // The route is /files/{key+} so key may contain slashes.
  // We receive the raw key from the path, which API Gateway decodes for us.
  const rawKey = event.pathParameters?.key;

  // Reconstruct the full key. The {key+} parameter captures everything after
  // /files/ — for keys like "uploads/userId/uuid-name.pdf" the path param
  // will be "uploads/userId/uuid-name.pdf" (decoded by API Gateway).
  const key = rawKey?.startsWith(config.uploadsPrefix)
    ? rawKey
    : `${config.uploadsPrefix}${rawKey}`;

  // ── Validate key ─────────────────────────────────────────
  const validation = validateObjectKey(key);
  if (!validation.valid) {
    console.log(`[deleteFile] invalid key code=${validation.code} userId=${userId} requestId=${requestId}`);
    return errorResponse(validation.code, validation.message);
  }

  // ── Ownership check — key must belong to this user ───────
  // Prevents user A from deleting user B's files by constructing their key.
  if (!key.startsWith(userPrefix)) {
    console.log(`[deleteFile] ownership violation userId=${userId} key=${key} requestId=${requestId}`);
    return errorResponse('INVALID_FILE_KEY', 'You do not have permission to delete this file.', 403);
  }

  // ── Verify object exists ─────────────────────────────────
  let exists;
  try {
    exists = await objectExists(key);
  } catch (err) {
    return internalError(`existence check failed: ${err.message}`);
  }

  if (!exists) {
    return errorResponse('FILE_NOT_FOUND', 'The file does not exist or was already deleted.', 404);
  }

  // ── Delete ───────────────────────────────────────────────
  try {
    await deleteFile(key);
  } catch (err) {
    return internalError(`delete failed: ${err.message}`);
  }

  const keyWithoutPrefix = key.slice(userPrefix.length);
  const displayName = keyWithoutPrefix.length > 37 ? keyWithoutPrefix.slice(37) : keyWithoutPrefix;

  console.log(`[deleteFile] success file=${displayName} userId=${userId} requestId=${requestId}`);

  return successResponse({ message: 'File deleted successfully.', key });
};
