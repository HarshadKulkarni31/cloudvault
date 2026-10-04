import { useState } from 'react';
import { Cloud, ShieldCheck, Loader2 } from 'lucide-react';
import { login } from '../services/auth.js';

/**
 * LoginPage — shown to unauthenticated users.
 * A single "Sign in with Google" button that redirects to Cognito Hosted UI.
 */
export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(); // redirects — this line is usually not reached
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-lg p-8 space-y-6">

        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-600 shadow-md">
            <Cloud className="w-7 h-7 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">CloudVault</h1>
          <p className="text-sm text-gray-500">
            Your private, serverless file vault
          </p>
        </div>

        {/* Sign in button */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
                     border border-gray-300 bg-white text-gray-700 font-medium text-sm
                     shadow-sm hover:bg-gray-50 hover:border-gray-400
                     active:bg-gray-100 transition-colors duration-150
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          ) : (
            /* Google G logo SVG */
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {loading ? 'Redirecting…' : 'Sign in with Google'}
        </button>

        {error && (
          <p className="text-xs text-red-600 text-center bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Trust signals */}
        <div className="border-t border-gray-100 pt-5 space-y-2">
          {[
            'Files stored privately in your own S3 vault',
            'No passwords — Google handles authentication',
            'Your files are never visible to other users',
          ].map((text) => (
            <div key={text} className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-gray-500">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Powered by AWS S3, Lambda & Cognito
      </p>
    </div>
  );
}
