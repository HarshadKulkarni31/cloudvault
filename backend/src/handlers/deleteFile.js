/**
 * deleteFile.js — DELETE /files/{key+}
 *
 * Validates the key, verifies the object exists, and deletes it from S3.
 */

import { validateObjectKey } from '../utils/validation.js';
import { objectExists, deleteFile } from '../services/s3Service.js';
import { successResponse, errorResponse, internalError } from '../utils/response.js';
import { config } from '../utils/config.js';

export const handler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'unknown';
  console.log(`[deleteFile] DELETE /files requestId=${requestId}`);

  // ── Extract key from path parameters ────────────────────
  // The route is /files/{key+} so key may contain slashes
  const rawKey = event.pathParameters?.key;

  // Reconstruct the full key with the uploads/ prefix if the path param
  // strips it (API Gateway path decodes the parameter)
  const key = rawKey?.startsWith(config.uploadsPrefix)
    ? rawKey
    : `${config.uploadsPrefix}${rawKey}`;

  // ── Validate key ─────────────────────────────────────────
  const validation = validateObjectKey(key);
  if (!validation.valid) {
    console.log(`[deleteFile] invalid key code=${validation.code} requestId=${requestId}`);
    return errorResponse(validation.code, validation.message);
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

  const keyWithoutPrefix = key.replace(config.uploadsPrefix, '');
  const dashIndex = keyWithoutPrefix.indexOf('-');
  const displayName = dashIndex !== -1 ? keyWithoutPrefix.slice(dashIndex + 1) : keyWithoutPrefix;

  console.log(`[deleteFile] success file=${displayName} requestId=${requestId}`);

  return successResponse({ message: 'File deleted successfully.', key });
};
