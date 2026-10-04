/**
 * s3Service.js — Shared S3 operations for CloudVault Lambda handlers
 *
 * Uses AWS SDK for JavaScript v3 (@aws-sdk/client-s3).
 * The Lambda execution role (not hardcoded credentials) provides AWS access.
 *
 * SECURITY: No credentials are stored here.
 * Lambda identity is assumed from the IAM execution role automatically.
 *
 * All list/quota/presign operations now accept a `prefix` parameter so that
 * each user's files are scoped to uploads/{userId}/ — enforcing per-user isolation.
 */

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../utils/config.js';

// Single S3 client instance shared across warm invocations
const s3 = new S3Client({ region: config.region });

// ─────────────────────────────────────────────────────────
// List files
// ─────────────────────────────────────────────────────────

/**
 * List all objects under the given prefix (scoped to a specific user).
 * Returns an array of file metadata objects.
 *
 * @param {string} prefix - Per-user prefix, e.g. "uploads/{userId}/"
 * @returns {Promise<Array<{key, name, size, lastModified, etag}>>}
 */
export async function listFiles(prefix) {
  const results = [];
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: config.bucketName,
      Prefix: prefix,
      MaxKeys: 1000,         // cap to avoid runaway pagination
      ContinuationToken: continuationToken,
    });

    const response = await s3.send(command);

    for (const obj of response.Contents ?? []) {
      if (obj.Key === prefix) continue; // skip folder placeholder

      // Extract original filename from key: {prefix}{uuid}-{sanitized-name}
      const keyWithoutPrefix = obj.Key.slice(prefix.length);
      // UUID is 36 chars (8-4-4-4-12), so original name starts at index 37 (uuid + '-')
      const displayName = keyWithoutPrefix.length > 37
        ? keyWithoutPrefix.slice(37)
        : keyWithoutPrefix;

      results.push({
        key: obj.Key,
        name: displayName,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag?.replace(/"/g, ''),
      });
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);;

  return results;
}

// ─────────────────────────────────────────────────────────
// Quota check
// ─────────────────────────────────────────────────────────

/**
 * Check current usage against configured quotas for a specific user.
 * Called before issuing a presigned upload URL.
 *
 * @param {string} prefix - Per-user prefix, e.g. "uploads/{userId}/"
 * @param {number} incomingFileSize - Size of the file about to be uploaded
 * @returns {Promise<{ allowed: boolean, reason?: string, code?: string, objectCount: number, totalBytes: number }>}
 */
export async function checkQuota(prefix, incomingFileSize) {
  const files = await listFiles(prefix);
  const objectCount = files.length;
  const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

  if (objectCount >= config.maxObjectCount) {
    return {
      allowed: false,
      code: 'QUOTA_EXCEEDED',
      reason: `Maximum object count (${config.maxObjectCount}) reached.`,
      objectCount,
      totalBytes,
    };
  }

  if (totalBytes + incomingFileSize > config.maxStorageBytes) {
    const maxMB = config.maxStorageBytes / 1024 / 1024;
    return {
      allowed: false,
      code: 'QUOTA_EXCEEDED',
      reason: `Upload would exceed the ${maxMB} MB storage quota.`,
      objectCount,
      totalBytes,
    };
  }

  return { allowed: true, objectCount, totalBytes };
}

// ─────────────────────────────────────────────────────────
// Presigned URLs
// ─────────────────────────────────────────────────────────

/**
 * Generate a presigned PUT URL for a direct browser-to-S3 upload.
 * Lambda never handles the file bytes — only this URL is returned.
 *
 * @param {string} key         - S3 object key (must start with uploads/{userId}/)
 * @param {string} contentType - Content-Type header the browser will send
 * @returns {Promise<string>} Presigned URL
 */
export async function generatePresignedPutUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    // Server-side encryption is inherited from bucket default (SSE-S3)
  });

  return getSignedUrl(s3, command, { expiresIn: config.presignedUrlExpiry });
}

/**
 * Generate a presigned GET URL for a direct S3-to-browser download.
 *
 * @param {string} key - S3 object key (must start with uploads/{userId}/)
 * @returns {Promise<string>} Presigned URL
 */
export async function generatePresignedGetUrl(key) {
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: config.presignedUrlExpiry });
}

// ─────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────

/**
 * Delete an S3 object.
 *
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
export async function deleteFile(key) {
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await s3.send(command);
}

// ─────────────────────────────────────────────────────────
// Head object (existence check)
// ─────────────────────────────────────────────────────────

/**
 * Check whether an S3 object exists.
 *
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>}
 */
export async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: config.bucketName, Key: key }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
}
