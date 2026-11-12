'use client';

import { Moon, Sun } from 'lucide-react';
import { applyTheme, useTheme } from '../ThemeToggle';
import { Segment } from '../ui/Segment';

// 설정 › 앱 › 테마 — [해 | 달] 세그먼트(글자 대신 아이콘, 이름은 aria-label · title).
// 사이드바 테마 버튼과 같은 상태라 어느 쪽을 바꿔도 같이 바뀜. 서버 렌더 땐 같은 크기 자리만.
export function ThemeSegment() {
  const theme = useTheme();
  if (theme === null) return <span aria-hidden className="inline-block h-9.5 w-32" />;
  return (
    <Segment
      label="테마"
      value={theme}
      onChange={applyTheme}
      options={[
        { value: 'light', title: '라이트', label: <Sun className="h-4.5 w-4.5" aria-hidden /> },
        { value: 'dark', title: '다크', label: <Moon className="h-4.5 w-4.5" aria-hidden /> },
      ]}
    />
  );
}
