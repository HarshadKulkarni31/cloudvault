/**
 * auth.js — Extract the authenticated user's ID from a Lambda event.
 *
 * API Gateway HTTP API with a JWT Authorizer populates:
 *   event.requestContext.authorizer.jwt.claims
 *
 * The Cognito 'sub' claim is a stable UUID that uniquely identifies the user
 * across sessions. It never changes even if the user's email changes.
 *
 * SECURITY: We read 'sub' from the JWT claims that API Gateway has already
 * validated. We do NOT trust any user-supplied header or body for identity.
 */

/**
 * Extract the authenticated user's stable ID from the Lambda event.
 *
 * @param {object} event - Lambda event object
 * @returns {string} The Cognito 'sub' claim (stable user UUID)
 * @throws {Error} If the claim is missing (misconfigured authorizer)
 */
export function getUserId(event) {
  const sub = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!sub) {
    // This should never happen if the JWT authorizer is correctly configured.
    // If it does, it means a route was accidentally left without auth.
    throw new Error('Missing user identity — JWT authorizer claims not found.');
  }
  return sub;
}

/**
 * Build the per-user S3 key prefix.
 * All of a user's files live under uploads/{userId}/
 *
 * @param {string} userId - Cognito sub claim
 * @param {string} uploadsPrefix - Base prefix from config (e.g. "uploads/")
 * @returns {string} e.g. "uploads/abc-123-def/"
 */
export function getUserPrefix(userId, uploadsPrefix) {
  return `${uploadsPrefix}${userId}/`;
}
