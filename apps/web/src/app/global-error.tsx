'use client';

import { useEffect } from 'react';

// Fires when RootLayout itself throws — Next.js replaces the whole document,
// so we must render <html> and <body> ourselves. Assume Tailwind + global CSS
// are unavailable in this state and inline the minimum styles.
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
        <div style={cardStyle}>
          <div style={iconStyle}>!</div>
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

// 최소 인라인 스타일. Tailwind/globals.css가 로드 안 된 상황 가정.
const rootStyle: React.CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  background: 'linear-gradient(135deg, #fafafa, #ffffff, #f4f4f5)',
  color: '#18181b',
  padding: '16px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '384px',
  textAlign: 'center',
};

const iconStyle: React.CSSProperties = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  background: '#fef3c7',
  color: '#b45309',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  fontWeight: 700,
  marginBottom: '24px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 600,
  margin: 0,
};

const descStyle: React.CSSProperties = {
  marginTop: '8px',
  fontSize: '14px',
  color: '#71717a',
};

const digestStyle: React.CSSProperties = {
  marginTop: '12px',
  fontFamily: 'ui-monospace, monospace',
  fontSize: '10px',
  color: '#a1a1aa',
};

const buttonRowStyle: React.CSSProperties = {
  marginTop: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '14px',
  fontWeight: 500,
  color: '#ffffff',
  background: '#18181b',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};

const linkButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '14px',
  color: '#52525b',
  background: 'transparent',
  border: '1px solid #e4e4e7',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
};
