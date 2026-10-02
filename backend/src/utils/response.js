/**
 * response.js — Standardised HTTP response builders
 * Consistent JSON shape across all Lambda handlers.
 *
 * Success:  { success: true,  data: {...} }
 * Error:    { success: false, error: { code, message } }
 */

/**
 * Build a success response.
 * @param {object} data - Response payload
 * @param {number} [statusCode=200]
 */
export function successResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({ success: true, data }),
  };
}

/**
 * Build an error response.
 * @param {string} code    - Machine-readable error code (e.g. FILE_TOO_LARGE)
 * @param {string} message - Human-readable message safe to expose to the client
 * @param {number} [statusCode=400]
 */
export function errorResponse(code, message, statusCode = 400) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify({ success: false, error: { code, message } }),
  };
}

/**
 * Convenience: internal server error (never expose raw error details to client).
 * @param {string} [loggedReason] - Reason to log server-side (not returned to client)
 */
export function internalError(loggedReason = '') {
  // Log the reason without exposing it in the HTTP body
  if (loggedReason) {
    console.error('[INTERNAL_ERROR]', loggedReason);
  }
  return errorResponse('INTERNAL_ERROR', 'An internal error occurred. Please try again.', 500);
}

/**
 * CORS headers — API Gateway also handles CORS but Lambda must echo them
 * for preflight pass-through cases and direct invocations.
 */
function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
  };
}
