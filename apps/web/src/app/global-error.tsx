'use client';

import { useEffect } from 'react';

// Fires when RootLayout itself throws — Next.js replaces the whole document,
// so we must render <html> and <body> ourselves. Assume Tailwind + global CSS
// are unavailable in this state and inline the minimum styles.
//
// docs/design/rally-error*.html '앱 전체가 멈췄을 때' — 오류 화면과 같은 아이콘 · 문구 · 버튼.
// CSS · 웹폰트가 안 올 수 있어 토큰 대신 색 값을 직접(라이트 한 벌 — 다크 토큰을 못 읽는 상황), 글꼴 system-ui.
const C = {
  paper: '#F6F7F5',
  ink: '#1C1F1D',
  inkSoft: '#3F4441',
  inkFaint: '#7A7E78',
  icon: '#8E928D',
  primary: '#1F3D30',
  onPrimary: '#FFFFFF',
  btnBorder: '#BFC4BE',
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body style={rootStyle}>
        <div style={groupStyle}>
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke={C.icon}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 12h3.5l1.8-3.5 2.4 7 1.8-3.5H20" />
            <circle cx="12" cy="12" r="9" strokeDasharray="3 3.5" />
          </svg>
          <h1 style={titleStyle}>화면을 불러오지 못했어요</h1>
          <p style={descStyle}>잠시 후 다시 해보세요. 계속 안 되면 피드백으로 알려주세요.</p>
          {error.digest ? <p style={digestStyle}>오류 코드 {error.digest}</p> : null}
          <div style={buttonRowStyle}>
            <button type="button" onClick={reset} style={primaryButtonStyle}>
              다시 불러오기
            </button>
            {/* 앱 전체 오류 화면은 RootLayout 밖이라 next/link 대신 <a> */}
            <a href="/today" style={linkButtonStyle}>
              오늘 화면으로
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

const rootStyle: React.CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  background: C.paper,
  color: C.ink,
  padding: '16px',
};

const groupStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '14px',
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: 700,
  color: C.ink,
  margin: 0,
};

const descStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.6,
  color: C.inkSoft,
  margin: 0,
};

const digestStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '12.5px',
  color: C.inkFaint,
  margin: 0,
};

const buttonRowStyle: React.CSSProperties = {
  marginTop: '6px',
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
};

const buttonBase: React.CSSProperties = {
  boxSizing: 'border-box',
  height: '40px',
  padding: '0 16px',
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: '14px',
  fontFamily: 'inherit',
  borderRadius: '6px',
  cursor: 'pointer',
  textDecoration: 'none',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonBase,
  fontWeight: 600,
  color: C.onPrimary,
  background: C.primary,
  border: `1px solid ${C.primary}`,
};

const linkButtonStyle: React.CSSProperties = {
  ...buttonBase,
  color: C.primary,
  background: '#FFFFFF',
  border: `1px solid ${C.btnBorder}`,
};
