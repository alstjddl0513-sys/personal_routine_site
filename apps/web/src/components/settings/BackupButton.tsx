'use client';

import { useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { getExportJson } from '../../lib/api';
import { toISODate } from '../../lib/routines-week';
import { SettingsRow } from './SettingsRow';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';

// 설정 › 계정 › 데이터 백업 — 줄 끝 [백업 파일 내려받기]. 실패 문구는 줄 아래(이름 칸부터)
export function BackupButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setBusy(true);
    try {
      const json = await getExportJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rally-backup-${toISODate(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError('백업을 내려받지 못했어요. 잠시 후 다시 해보세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsRow
      icon={Download}
      title="데이터 백업"
      desc="지금까지의 기록을 파일 하나로 내려받아 보관해두세요. 이력서·포트폴리오 파일은 들어가지 않아요."
      end={
        <button type="button" onClick={onClick} disabled={busy} aria-busy={busy} className={`${BUTTON_SECONDARY} gap-1.5`}>
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <Download className="h-4 w-4" aria-hidden />
          )}
          {busy ? '내려받는 중…' : '백업 파일 내려받기'}
        </button>
      }
      below={
        error ? (
          <span role="alert" className="text-[13px] text-alert">
            {error}
          </span>
        ) : undefined
      }
    />
  );
}
