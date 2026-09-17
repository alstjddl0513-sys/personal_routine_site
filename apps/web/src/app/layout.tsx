import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { BottomNav } from '../components/BottomNav';
import { DeadlineNotifier } from '../components/DeadlineNotifier';
import { MorningSummary } from '../components/MorningSummary';
import { RoutineReminder } from '../components/RoutineReminder';
import { SectionSubNav } from '../components/SectionSubNav';
import { Sidebar } from '../components/Sidebar';
import { WorkoutSkipReminder } from '../components/WorkoutSkipReminder';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Rally',
  description: '취준 루틴/커리어 트래커',
  appleWebApp: {
    capable: true,
    title: 'Rally',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

// Runs synchronously in <head> before any React or paint so `.dark` is on
// <html> when styles first apply — no color flash on load. localStorage read
// is wrapped in try/catch for private mode / disabled storage. If no user
// preference is set, fall back to OS setting.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = window.localStorage.getItem('rally.theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

// iOS "add to home screen" splash images (portrait only). CSS px + dpr must
// match exactly for Safari to pick the file — keep entries in sync with
// scripts/generate-icons.mjs. Light-mode only (dark falls back gracefully).
const IOS_SPLASH: ReadonlyArray<{ name: string; w: number; h: number; dpr: number }> = [
  { name: 'iphone-15-pro-max', w: 430, h: 932, dpr: 3 },
  { name: 'iphone-15-pro', w: 393, h: 852, dpr: 3 },
  { name: 'iphone-15-plus', w: 428, h: 926, dpr: 3 },
  { name: 'iphone-15', w: 390, h: 844, dpr: 3 },
  { name: 'iphone-13-mini', w: 375, h: 812, dpr: 3 },
  { name: 'iphone-11-pro-max', w: 414, h: 896, dpr: 3 },
  { name: 'iphone-11', w: 414, h: 896, dpr: 2 },
  { name: 'iphone-8-plus', w: 414, h: 736, dpr: 3 },
  { name: 'iphone-8', w: 375, h: 667, dpr: 2 },
  { name: 'iphone-se', w: 320, h: 568, dpr: 2 },
  { name: 'ipad-pro-12', w: 1024, h: 1366, dpr: 2 },
  { name: 'ipad-pro-11', w: 834, h: 1194, dpr: 2 },
  { name: 'ipad-air-10-5', w: 810, h: 1080, dpr: 2 },
  { name: 'ipad-mini', w: 744, h: 1133, dpr: 2 },
  { name: 'ipad-9-7', w: 768, h: 1024, dpr: 2 },
];

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {IOS_SPLASH.map(({ name, w, h, dpr }) => (
          <link
            key={name}
            rel="apple-touch-startup-image"
            href={`/splash/${name}.png`}
            media={`screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}
          />
        ))}
      </head>
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-auto pb-20 md:pb-0">
            <SectionSubNav />
            {children}
          </main>
        </div>
        <BottomNav />
        <DeadlineNotifier />
        <MorningSummary />
        <RoutineReminder />
        <WorkoutSkipReminder />
      </body>
    </html>
  );
}
