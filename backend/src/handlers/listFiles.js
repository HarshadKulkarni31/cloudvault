/**
 * listFiles.js — GET /files
 *
 * Returns metadata for all objects belonging to the authenticated user.
 * Files are scoped to uploads/{userId}/ — users never see each other's files.
 * No file bytes pass through Lambda.
 */

import { listFiles } from '../services/s3Service.js';
import { successResponse, internalError } from '../utils/response.js';
import { getUserId, getUserPrefix } from '../utils/auth.js';
import { config } from '../utils/config.js';

export const handler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'unknown';

  // ── Extract authenticated user identity ──────────────────
  // sub is validated by API Gateway JWT Authorizer — safe to trust
  let userId;
  try {
    userId = getUserId(event);
  } catch (err) {
    console.error(`[listFiles] auth error requestId=${requestId}`, err.message);
    return internalError('auth claim extraction failed');
  }

  const userPrefix = getUserPrefix(userId, config.uploadsPrefix);
  console.log(`[listFiles] GET /files userId=${userId} requestId=${requestId}`);

  try {
    const files = await listFiles(userPrefix);

    console.log(`[listFiles] success count=${files.length} userId=${userId} requestId=${requestId}`);

    return successResponse({
      files,
      count: files.length,
      totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
    });
  } catch (err) {
    return internalError(`listFiles failed: ${err.message}`);
  }
};
