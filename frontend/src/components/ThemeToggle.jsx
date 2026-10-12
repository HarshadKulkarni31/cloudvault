import { Monitor, Moon, Sun } from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'Auto', icon: Monitor },
  { value: 'dark', label: 'Night', icon: Moon },
];

export default function ThemeToggle({ themeMode, onThemeChange }) {
  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-slate-700 dark:bg-slate-800"
      aria-label="Theme mode"
      role="group"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = themeMode === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onThemeChange(value)}
            className={[
              'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors',
              selected
                ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-950 dark:text-slate-50'
                : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100',
            ].join(' ')}
            aria-pressed={selected}
            aria-label={`${label} theme`}
            title={`${label} theme`}
          >
            <Icon className="h-4 w-4" />
            <span className="ml-1.5 hidden lg:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
