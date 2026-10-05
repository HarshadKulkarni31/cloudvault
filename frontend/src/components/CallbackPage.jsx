import { useEffect, useRef, useState } from "react";
import { Cloud, AlertCircle } from "lucide-react";
import { handleCallback } from "../services/auth.js";

/**
 * Handles the OAuth redirect from Cognito.
 *
 * React 18 StrictMode may execute effects twice in development.
 * We therefore create the callback promise only once and let both
 * effect executions observe the same result.
 */
export default function CallbackPage({ onSuccess }) {
  const [error, setError] = useState(null);
  const callbackPromiseRef = useRef(null);

  useEffect(() => {
    // Start the OAuth callback exactly once.
    if (!callbackPromiseRef.current) {
      callbackPromiseRef.current = handleCallback();
    }

    callbackPromiseRef.current
      .then((result) => {
        if (result.success) {
          onSuccess();
        } else {
          setError(result.error || "Authentication failed. Please try again.");
        }
      })
      .catch((err) => {
        setError(err?.message || "Authentication failed. Please try again.");
      });
  }, [onSuccess]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-md">
          <Cloud className="w-7 h-7 text-white" strokeWidth={2} />
        </div>

        {error ? (
          <div className="max-w-sm space-y-3">
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
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
              Back to sign in
            </a>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700">Signing you in…</p>

            <p className="text-xs text-gray-400 mt-1">
              Completing secure authentication
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
