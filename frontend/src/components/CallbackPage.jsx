import { useEffect, useState } from 'react';
import { Cloud, Loader2, AlertCircle } from 'lucide-react';
import { handleCallback } from '../services/auth.js';

/**
 * CallbackPage — handles the OAuth redirect from Cognito.
 *
 * Cognito redirects to /callback?code=...&state=...
 * This component exchanges the code for tokens and then navigates to the app root.
 *
 * @param {{ onSuccess: () => void }} props
 */
export default function CallbackPage({ onSuccess }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await handleCallback();
      if (cancelled) return;

      if (result.success) {
        // Clean up the URL and hand control back to the app
        window.history.replaceState({}, document.title, '/');
        onSuccess();
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    })();

    return () => { cancelled = true; };
  }, [onSuccess]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-md">
          <Cloud className="w-7 h-7 text-white" strokeWidth={2} />
        </div>

        {error ? (
          <div className="max-w-sm space-y-3">
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50
                            border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium">Sign-in failed</p>
                <p className="text-xs mt-0.5 text-red-600">{error}</p>
              </div>
            </div>
            <a
              href="/"
              className="inline-block text-sm text-brand-600 hover:underline underline-offset-2"
            >
              ← Back to sign in
            </a>
          </div>
        ) : (
          <>
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
            <p className="text-sm text-gray-600 font-medium">Signing you in…</p>
            <p className="text-xs text-gray-400">Completing authentication with Google</p>
          </>
        )}
      </div>
    </div>
  );
}
