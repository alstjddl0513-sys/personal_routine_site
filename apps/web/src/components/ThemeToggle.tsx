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

export function applyTheme(next: Theme) {
  const el = document.documentElement;
  if (next === 'dark') el.classList.add('dark');
  else el.classList.remove('dark');
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {}
  themeListeners.forEach((fn) => fn());
}

// 설정의 테마 세그먼트(ThemeSegment)도 같은 상태를 씀 — 사이드바 토글과 서로 바로 맞춰짐
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribeTheme, readThemeClient, readThemeServer);
}

// 사이드바 하단 🌙/☀ 버튼 — 모양은 쓰는 쪽(Sidebar)이 정함
export function ThemeToggle({ className }: { className: string }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    readThemeClient,
    readThemeServer,
  );

  // Same-size placeholder while SSR snapshot is null — keeps layout stable.
  if (theme === null) {
    return (
      <div aria-hidden className={`${className} invisible`} />
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
      className={className}
    >
      {theme === 'dark' ? (
        <Sun className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Moon className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
