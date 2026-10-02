/**
 * formatFileSize.js — Human-readable file size formatting
 */

/**
 * @param {number} bytes
 * @returns {string}  e.g. "1.2 MB", "450 KB", "23 B"
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Percentage of quota used.
 * @param {number} used   - bytes used
 * @param {number} total  - quota in bytes
 * @returns {number} 0–100
 */
export function quotaPercent(used, total) {
  if (total === 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}
