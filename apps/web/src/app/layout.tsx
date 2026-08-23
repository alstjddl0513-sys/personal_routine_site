import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "../components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rally",
  description: "취준 루틴/커리어 트래커",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
