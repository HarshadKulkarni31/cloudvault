/**
 * api.js — CloudVault API service layer
 *
 * Wraps all API Gateway calls. The base URL is read from the VITE_API_URL
 * environment variable — set in .env.local for local dev.
 *
 * SECURITY: No AWS credentials are used here.
 * File bytes are sent DIRECTLY to S3 via presigned URLs — never through this module's API calls.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';

if (!BASE_URL) {
  console.warn(
    '[CloudVault] VITE_API_URL is not set. ' +
    'Create frontend/.env.local with VITE_API_URL=<your-api-gateway-url>'
  );
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─────────────────────────────────────────────────────────
// Normalise errors into a consistent shape
// ─────────────────────────────────────────────────────────
function normalizeError(err) {
  if (err.response?.data?.error) {
    return err.response.data.error; // { code, message }
  }
  if (err.code === 'ECONNABORTED') {
    return { code: 'TIMEOUT', message: 'The request timed out. Please try again.' };
  }
  if (!err.response) {
    return { code: 'NETWORK_ERROR', message: 'Unable to reach the server. Check your connection.' };
  }
  return { code: 'UNKNOWN_ERROR', message: err.message || 'An unexpected error occurred.' };
}

// ─────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────
export async function checkHealth() {
  try {
    const { data } = await apiClient.get('/health');
    return { success: true, data: data.data };
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}

// ─────────────────────────────────────────────────────────
// List files
// ─────────────────────────────────────────────────────────
export async function listFiles() {
  try {
    const { data } = await apiClient.get('/files');
    return { success: true, data: data.data };
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}

// ─────────────────────────────────────────────────────────
// Upload — two steps:
//   1. Get presigned PUT URL from Lambda
//   2. PUT file directly to S3 (file bytes never go through Lambda)
// ─────────────────────────────────────────────────────────

/**
 * Step 1: Request a presigned upload URL from the API.
 * @param {{ fileName: string, contentType: string, fileSize: number }} meta
 */
export async function requestUploadUrl({ fileName, contentType, fileSize }) {
  try {
    const { data } = await apiClient.post('/upload-url', { fileName, contentType, fileSize });
    return { success: true, data: data.data }; // { uploadUrl, key, expiresIn }
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}

/**
 * Step 2: Upload the file directly to S3 using the presigned PUT URL.
 * This request goes directly to S3 — NOT through API Gateway or Lambda.
 *
 * @param {string}   uploadUrl   - Presigned PUT URL from step 1
 * @param {File}     file        - Browser File object
 * @param {string}   contentType - Content-Type to set on the S3 object
 * @param {Function} onProgress  - Callback(percentComplete: number)
 */
export async function uploadFileToS3(uploadUrl, file, contentType, onProgress) {
  try {
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': contentType },
      timeout: 5 * 60 * 1000, // 5 minutes for large files
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress?.(pct);
        }
      },
    });
    return { success: true };
  } catch (err) {
    if (err.response?.status === 403) {
      return {
        success: false,
        error: { code: 'UPLOAD_FAILED', message: 'Upload authorisation expired. Please try again.' },
      };
    }
    return { success: false, error: normalizeError(err) };
  }
}

// ─────────────────────────────────────────────────────────
// Download — returns presigned GET URL for direct S3 access
// ─────────────────────────────────────────────────────────
export async function requestDownloadUrl(key) {
  try {
    const { data } = await apiClient.get('/download-url', { params: { key } });
    return { success: true, data: data.data }; // { downloadUrl, key, expiresIn }
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}

// ─────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────
export async function deleteFile(key) {
  try {
    // URL-encode key portions, but preserve the path structure
    const encodedKey = encodeURIComponent(key);
    const { data } = await apiClient.delete(`/files/${encodedKey}`);
    return { success: true, data: data.data };
  } catch (err) {
    return { success: false, error: normalizeError(err) };
  }
}
