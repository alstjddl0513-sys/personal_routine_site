import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rally',
    short_name: 'Rally',
    description: '취준 루틴/커리어 트래커',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    // layout.tsx viewport `themeColor` 라이트 값(= --rally-paper)과 같게 — Android 스플래시 바탕.
    // iOS 상태바는 layout의 meta(라이트 · 다크 따로)를 따름.
    background_color: '#f6f7f5',
    theme_color: '#f6f7f5',
    icons: [
      // Scalable SVG satisfies Chrome's install-prompt requirement for
      // both 192 and 512 without needing separate PNG renders.
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      // Maskable variant with full-bleed bg + inner 80% safe zone so
      // Android adaptive-icon shapes don't clip the flag.
      {
        src: '/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      // PNG fallbacks for browsers that don't accept SVG in manifest.
      // 192 satisfies Chrome's install-prompt spec; 512 is the splash-screen
      // source on Android.
      {
        src: '/flag-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/flag-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
