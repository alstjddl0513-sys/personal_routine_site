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
      {
        src: '/flag-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
