/**
 * listFiles.js — GET /files
 * Returns metadata for all objects in the uploads/ prefix.
 * No file bytes pass through Lambda.
 */

import { listFiles } from '../services/s3Service.js';
import { successResponse, internalError } from '../utils/response.js';

export const handler = async (event) => {
  const requestId = event.requestContext?.requestId ?? 'unknown';
  console.log(`[listFiles] GET /files requestId=${requestId}`);

  try {
    const files = await listFiles();

    console.log(`[listFiles] success count=${files.length} requestId=${requestId}`);

    return successResponse({
      files,
      count: files.length,
      totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
    });
  } catch (err) {
    return internalError(`listFiles failed: ${err.message}`);
  }
};
