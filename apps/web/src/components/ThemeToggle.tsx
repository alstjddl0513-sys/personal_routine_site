'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'rally.theme';
type Theme = 'light' | 'dark';

function apply(next: Theme) {
  const el = document.documentElement;
  if (next === 'dark') el.classList.add('dark');
  else el.classList.remove('dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // localStorage unavailable — theme still applies in memory.
  }
}

export function ThemeToggle() {
  // The <html>.dark class is set by an inline script before hydration, but
  // useState initial value can't peek at it (SSR sees null document). Read
  // once on mount to sync UI with what's already visible.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    apply(next);
    setTheme(next);
  }

  // While the icon identity is unknown we render a placeholder of the same
  // size — keeps sidebar layout stable and avoids showing the wrong icon.
  if (theme === null) {
    return (
      <div
        aria-hidden
        className="h-7 w-7 rounded-md border border-transparent"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {theme === 'dark' ? (
        <Sun className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Moon className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
