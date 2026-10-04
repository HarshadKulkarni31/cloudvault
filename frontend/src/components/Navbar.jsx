import { Cloud, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { logout } from '../services/auth.js';

/**
 * Navbar — top application bar with branding and user account menu.
 *
 * @param {{ user: { name: string, email: string, picture?: string } }} props
 */
export default function Navbar({ user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout(); // clears tokens & redirects to Cognito logout
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Branding */}
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 text-brand-600" strokeWidth={2} />
          <span className="font-semibold text-gray-900 tracking-tight">CloudVault</span>
        </div>

        {/* User account menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1
                         hover:bg-gray-100 transition-colors duration-150"
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              {/* Avatar */}
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center
                                 text-white text-sm font-semibold">
                  {user.name?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
              <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[140px] truncate">
                {user.name}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200
                              shadow-lg py-1 animate-fade-in z-50">
                {/* User info */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                </div>

                {/* Sign out */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600
                             hover:bg-red-50 transition-colors duration-150"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
