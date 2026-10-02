import { Cloud, Lock } from 'lucide-react';

/**
 * Navbar — top application bar with branding and demo notice.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 text-brand-600" strokeWidth={2} />
          <span className="font-semibold text-gray-900 tracking-tight">CloudVault</span>
        </div>

        {/* Demo notice */}
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50
                        border border-amber-200 rounded-full px-3 py-1">
          <Lock className="w-3 h-3" />
          <span>Demo mode — unauthenticated, shared namespace</span>
        </div>
      </div>
    </header>
  );
}
