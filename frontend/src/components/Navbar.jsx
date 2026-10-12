import { Cloud, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { logout } from '../services/auth.js';
import ThemeToggle from './ThemeToggle.jsx';

/**
 * Navbar — top application bar with branding and user account menu.
 *
 * @param {{ user: { name: string, email: string, picture?: string }, themeMode: string, onThemeChange: (theme: string) => void }} props
 */
export default function Navbar({ user, themeMode, onThemeChange }) {
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
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm transition-colors duration-200 dark:bg-slate-900/95 dark:border-slate-800 dark:shadow-none">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">

        {/* Branding */}
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 text-brand-600" strokeWidth={2} />
          <span className="font-semibold text-gray-900 tracking-tight dark:text-slate-50">CloudVault</span>
        </div>

        {/* User account menu */}
        {user && (
          <div className="flex items-center gap-3">
            <ThemeToggle themeMode={themeMode} onThemeChange={onThemeChange} />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1
                           hover:bg-gray-100 transition-colors duration-150
                           dark:hover:bg-slate-800"
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
                <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[140px] truncate dark:text-slate-300">
                  {user.name}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-150 dark:text-slate-500 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200
                                shadow-lg py-1 animate-fade-in z-50
                                dark:bg-slate-900 dark:border-slate-800 dark:shadow-2xl">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                    <p className="text-sm font-medium text-gray-900 truncate dark:text-slate-50">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5 dark:text-slate-400">{user.email}</p>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600
                               hover:bg-red-50 transition-colors duration-150
                               dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
