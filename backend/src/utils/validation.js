/**
 * validation.js — All file/key validation logic
 *
 * SECURITY: Lambda re-validates everything the frontend sends.
 * Never trust client-provided data alone.
 */

import path from 'path';
import { config } from './config.js';

// ─────────────────────────────────────────────────────────
// File metadata validation
// ─────────────────────────────────────────────────────────

/**
 * Validate the upload request body.
 * @param {{ fileName: string, contentType: string, fileSize: number }} body
 * @returns {{ valid: boolean, code?: string, message?: string }}
 */
export function validateUploadRequest(body) {
  const { fileName, contentType, fileSize } = body ?? {};

  if (!fileName || typeof fileName !== 'string') {
    return err('INVALID_REQUEST', 'fileName is required.');
  }
  if (!contentType || typeof contentType !== 'string') {
    return err('INVALID_REQUEST', 'contentType is required.');
  }
  if (typeof fileSize !== 'number' || fileSize <= 0) {
    return err('INVALID_REQUEST', 'fileSize must be a positive number.');
  }

  // Size check
  if (fileSize > config.maxFileSizeBytes) {
    const maxMB = config.maxFileSizeBytes / 1024 / 1024;
    return err('FILE_TOO_LARGE', `File exceeds the ${maxMB} MB limit.`);
  }

  // Content type allowlist
  if (!config.allowedContentTypes.has(contentType)) {
    return err('UNSUPPORTED_FILE_TYPE', `Content type "${contentType}" is not allowed.`);
  }

  // Extension allowlist (secondary defence)
  const ext = path.extname(fileName).replace('.', '').toLowerCase();
  if (!config.allowedExtensions.has(ext)) {
    return err('UNSUPPORTED_FILE_TYPE', `File extension ".${ext}" is not allowed.`);
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────
// S3 object key validation
// ─────────────────────────────────────────────────────────

/**
 * Validate that an S3 object key is safe and within the uploads/ prefix.
 * Prevents path traversal, prefix escape, and injection.
 *
 * @param {string} key - S3 object key provided by the client
 * @returns {{ valid: boolean, code?: string, message?: string }}
 */
export function validateObjectKey(key) {
  if (!key || typeof key !== 'string') {
    return err('INVALID_REQUEST', 'Object key is required.');
  }

  // Must start with the configured uploads prefix
  if (!key.startsWith(config.uploadsPrefix)) {
    return err('INVALID_FILE_KEY', 'Object key must start with the uploads prefix.');
  }

  // Reject path traversal patterns
  if (key.includes('..') || key.includes('//') || key.startsWith('/')) {
    return err('INVALID_FILE_KEY', 'Object key contains invalid characters.');
  }

  // Reject null bytes and control characters
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(key)) {
    return err('INVALID_FILE_KEY', 'Object key contains control characters.');
  }

  // Reasonable length limit
  if (key.length > 512) {
    return err('INVALID_FILE_KEY', 'Object key is too long.');
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────
// Filename sanitisation
// ─────────────────────────────────────────────────────────

/**
 * Sanitise an original filename for safe use in an S3 key.
 * Strips path components, replaces unsafe chars, and limits length.
 *
 * @param {string} fileName - Original filename from the client
 * @returns {string} Sanitised filename
 */
export function sanitizeFileName(fileName) {
  // Remove path components (Windows + Unix)
  const base = path.basename(fileName);

  // Replace any character that isn't alphanumeric, dash, underscore, or dot
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit to 200 characters
  return safe.slice(0, 200);
}

// ─────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────
function err(code, message) {
  return { valid: false, code, message };
}
