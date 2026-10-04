/**
 * auth.js — Cognito + Google OAuth authentication for CloudVault
 *
 * Flow:
 *  1. User clicks "Sign in with Google"
 *  2. Browser redirects to Cognito Hosted UI → Google → back to /callback
 *  3. /callback exchanges the authorization code for tokens via Cognito's token endpoint
 *  4. Tokens are stored in sessionStorage (not localStorage — cleared on tab close)
 *  5. The ID token is sent as "Authorization: Bearer <token>" on every API call
 *  6. On expiry, the refresh token silently gets a new ID token
 *
 * SECURITY:
 *  - Authorization Code flow (not implicit) — tokens never appear in the URL
 *  - PKCE is used to prevent authorization code interception attacks
 *  - Tokens are stored in sessionStorage (not cookies — no CSRF risk)
 *  - No AWS credentials are ever stored on the client
 */

const COGNITO_DOMAIN   = import.meta.env.VITE_COGNITO_DOMAIN;   // e.g. https://cloudvault-auth.auth.ap-south-1.amazoncognito.com
const CLIENT_ID        = import.meta.env.VITE_COGNITO_CLIENT_ID;
const REDIRECT_URI     = `${window.location.origin}/callback`;

// sessionStorage keys
const KEY_ID_TOKEN      = 'cv_id_token';
const KEY_ACCESS_TOKEN  = 'cv_access_token';
const KEY_REFRESH_TOKEN = 'cv_refresh_token';
const KEY_EXPIRES_AT    = 'cv_expires_at';
const KEY_USER_INFO     = 'cv_user_info';
const KEY_PKCE_VERIFIER = 'cv_pkce_verifier';

// ─────────────────────────────────────────────────────────
// PKCE helpers
// ─────────────────────────────────────────────────────────

function generateRandomString(length = 64) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, length);
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generatePkce() {
  const verifier = generateRandomString(64);
  const hash = await sha256(verifier);
  const challenge = base64UrlEncode(hash);
  return { verifier, challenge };
}

// ─────────────────────────────────────────────────────────
// Login — redirect to Cognito Hosted UI
// ─────────────────────────────────────────────────────────

export async function login() {
  if (!COGNITO_DOMAIN || !CLIENT_ID) {
    throw new Error(
      'VITE_COGNITO_DOMAIN and VITE_COGNITO_CLIENT_ID must be set in frontend/.env.local'
    );
  }

  const { verifier, challenge } = await generatePkce();
  sessionStorage.setItem(KEY_PKCE_VERIFIER, verifier);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    scope:                 'email openid profile',
    identity_provider:     'Google',   // skip the Cognito selection screen
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${COGNITO_DOMAIN}/oauth2/authorize?${params}`;
}

// ─────────────────────────────────────────────────────────
// Callback — exchange authorization code for tokens
// ─────────────────────────────────────────────────────────

/**
 * Call this from the /callback route after Cognito redirects back.
 * Exchanges the code for tokens and stores them.
 *
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const error  = params.get('error');

  if (error) {
    return { success: false, error: params.get('error_description') || error };
  }
  if (!code) {
    return { success: false, error: 'No authorization code in callback URL.' };
  }

  const verifier = sessionStorage.getItem(KEY_PKCE_VERIFIER);
  if (!verifier) {
    return { success: false, error: 'PKCE verifier missing — please try signing in again.' };
  }
  sessionStorage.removeItem(KEY_PKCE_VERIFIER);

  // Exchange code for tokens
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     CLIENT_ID,
    code,
    redirect_uri:  REDIRECT_URI,
    code_verifier: verifier,
  });

  let tokenData;
  try {
    const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    tokenData = await res.json();
    if (!res.ok) {
      return { success: false, error: tokenData.error_description || tokenData.error || 'Token exchange failed.' };
    }
  } catch (err) {
    return { success: false, error: `Network error during token exchange: ${err.message}` };
  }

  storeTokens(tokenData);
  return { success: true };
}

// ─────────────────────────────────────────────────────────
// Token storage & retrieval
// ─────────────────────────────────────────────────────────

function storeTokens({ id_token, access_token, refresh_token, expires_in }) {
  sessionStorage.setItem(KEY_ID_TOKEN, id_token);
  sessionStorage.setItem(KEY_ACCESS_TOKEN, access_token);
  if (refresh_token) sessionStorage.setItem(KEY_REFRESH_TOKEN, refresh_token);
  sessionStorage.setItem(KEY_EXPIRES_AT, String(Date.now() + expires_in * 1000));

  // Decode user info from the ID token (it's a signed JWT — we read payload only)
  try {
    const payload = JSON.parse(atob(id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    sessionStorage.setItem(KEY_USER_INFO, JSON.stringify({
      email: payload.email,
      name:  payload.name || payload.email,
      picture: payload.picture,
      sub:   payload.sub,
    }));
  } catch {
    // Non-fatal — user info just won't be available
  }
}

/**
 * Get the current ID token. Silently refreshes if expired.
 * Returns null if the user is not signed in.
 *
 * @returns {Promise<string|null>}
 */
export async function getIdToken() {
  const idToken    = sessionStorage.getItem(KEY_ID_TOKEN);
  const expiresAt  = Number(sessionStorage.getItem(KEY_EXPIRES_AT) || 0);
  const refreshToken = sessionStorage.getItem(KEY_REFRESH_TOKEN);

  if (!idToken) return null;

  // Refresh if within 60 seconds of expiry
  if (Date.now() > expiresAt - 60_000) {
    if (!refreshToken) {
      clearTokens();
      return null;
    }
    const ok = await silentRefresh(refreshToken);
    if (!ok) {
      clearTokens();
      return null;
    }
  }

  return sessionStorage.getItem(KEY_ID_TOKEN);
}

async function silentRefresh(refreshToken) {
  try {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      refresh_token: refreshToken,
    });
    const res = await fetch(`${COGNITO_DOMAIN}/oauth2/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    if (!res.ok) return false;
    const tokenData = await res.json();
    storeTokens(tokenData);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────

export function logout() {
  clearTokens();

  // Redirect to Cognito logout endpoint — invalidates the Cognito session
  // and redirects back to the app's root.
  const params = new URLSearchParams({
    client_id:   CLIENT_ID,
    logout_uri:  window.location.origin,
  });
  window.location.href = `${COGNITO_DOMAIN}/logout?${params}`;
}

function clearTokens() {
  sessionStorage.removeItem(KEY_ID_TOKEN);
  sessionStorage.removeItem(KEY_ACCESS_TOKEN);
  sessionStorage.removeItem(KEY_REFRESH_TOKEN);
  sessionStorage.removeItem(KEY_EXPIRES_AT);
  sessionStorage.removeItem(KEY_USER_INFO);
}

// ─────────────────────────────────────────────────────────
// User info
// ─────────────────────────────────────────────────────────

/**
 * Returns the currently signed-in user's profile (from the ID token payload).
 * Returns null if not signed in.
 *
 * @returns {{ email: string, name: string, picture?: string, sub: string } | null}
 */
export function getCurrentUser() {
  const raw = sessionStorage.getItem(KEY_USER_INFO);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Returns true if the user is currently signed in with a valid (non-expired) token.
 * Does NOT attempt a silent refresh — use getIdToken() for that.
 *
 * @returns {boolean}
 */
export function isSignedIn() {
  return (
    !!sessionStorage.getItem(KEY_ID_TOKEN) &&
    Date.now() < Number(sessionStorage.getItem(KEY_EXPIRES_AT) || 0)
  );
}
