import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rally',
    short_name: 'Rally',
    description: '취준 루틴/커리어 트래커',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    // Match viewport `themeColor` light value so the Android splash screen
    // bg matches the app background. iOS status bar respects the meta tag
    // set by layout.tsx viewport export (media-query aware).
    background_color: '#fafafa',
    theme_color: '#fafafa',
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
      // PNG fallback for browsers that don't accept SVG in manifest.
      {
        src: '/flag-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
