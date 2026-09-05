'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'rally.theme';
type Theme = 'light' | 'dark';
type Snapshot = Theme | null;

// The <html>.dark class is set by an inline script in layout.tsx before
// React hydrates, so `useSyncExternalStore` can read it directly instead
// of the setState-in-effect anti-pattern (React 19 warns).
const themeListeners = new Set<() => void>();

function readThemeClient(): Snapshot {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function readThemeServer(): Snapshot {
  return null;
}

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  return () => {
    themeListeners.delete(callback);
  };
}

function applyTheme(next: Theme) {
  const el = document.documentElement;
  if (next === 'dark') el.classList.add('dark');
  else el.classList.remove('dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  themeListeners.forEach((fn) => fn());
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readThemeClient,
    readThemeServer,
  );

  // Same-size placeholder while SSR snapshot is null — keeps layout stable.
  if (theme === null) {
    return (
      <div
        aria-hidden
        className="h-7 w-7 rounded-md border border-transparent"
      />
    );
  }

  function toggle() {
    applyTheme(theme === 'dark' ? 'light' : 'dark');
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
