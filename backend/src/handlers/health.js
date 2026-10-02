/**
 * health.js — GET /health
 * Simple liveness check — no S3 call to avoid unnecessary cost.
 */

import { successResponse } from '../utils/response.js';

export const handler = async () => {
  console.log('[health] GET /health');

  return successResponse({
    status: 'ok',
    service: 'CloudVault API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
};
