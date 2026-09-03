'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';

const PRESETS = [60, 90, 120, 180] as const;
const STORAGE_KEY = 'rally.restTimer.lastPreset';
const DEFAULT_PRESET = 90;

type Status = 'idle' | 'running' | 'paused' | 'done';

function formatMMSS(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

// 짧은 beep 하나. Web Audio라 별도 asset 파일 불필요.
function playBeep() {
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.001;
    osc.connect(gain).connect(ctx.destination);
    const now = ctx.currentTime;
    // ADSR 흉내: 짧게 상승 → 감쇠. 총 ~0.4s 두 번.
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    gain.gain.setValueAtTime(0.001, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.41);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
    osc.start(now);
    osc.stop(now + 0.8);
    // 컨텍스트는 잠시 후 close (메모리 해제)
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // 사용자 제스처 전 재생은 브라우저가 막을 수 있음. 조용히 skip
  }
}

function vibrate() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // no-op
  }
}

function notifyIfAllowed(body: string) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      // tag: 같은 tag의 이전 알림은 덮어씀 (연속 사용 시 스팸 방지)
      new Notification('Rally · 휴식 종료', {
        body,
        tag: 'rally-rest-timer',
        silent: false,
      });
    }
  } catch {
    // no-op
  }
}

export function RestTimer() {
  const [status, setStatus] = useState<Status>('idle');
  const [totalSec, setTotalSec] = useState<number>(DEFAULT_PRESET);
  const [remainingMs, setRemainingMs] = useState<number>(DEFAULT_PRESET * 1000);
  const [lastPreset, setLastPreset] = useState<number>(DEFAULT_PRESET);
  // 실제 종료 시각(ms since epoch). setInterval은 백그라운드에서 스로틀되므로,
  // deadline 기준으로 남은 시간을 계산해 스로틀에 무관하게 정확도 유지.
  const deadlineRef = useRef<number | null>(null);
  // 일시정지 시점의 남은 ms를 저장해 resume에서 deadline 재계산.
  const pausedRemainingRef = useRef<number | null>(null);

  // 마지막 프리셋 복원
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) {
          setLastPreset(n);
          setTotalSec(n);
          setRemainingMs(n * 1000);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // 카운트다운 tick
  useEffect(() => {
    if (status !== 'running') return;
    const id = window.setInterval(() => {
      if (deadlineRef.current == null) return;
      const rem = deadlineRef.current - Date.now();
      if (rem <= 0) {
        setRemainingMs(0);
        setStatus('done');
        deadlineRef.current = null;
        playBeep();
        vibrate();
        notifyIfAllowed(`${totalSec}초 휴식 완료`);
        return;
      }
      setRemainingMs(rem);
    }, 200);
    return () => window.clearInterval(id);
  }, [status, totalSec]);

  const start = useCallback((sec: number) => {
    setTotalSec(sec);
    setLastPreset(sec);
    setRemainingMs(sec * 1000);
    deadlineRef.current = Date.now() + sec * 1000;
    pausedRemainingRef.current = null;
    setStatus('running');
    try {
      window.localStorage.setItem(STORAGE_KEY, String(sec));
    } catch {
      // ignore
    }
    // 첫 시작 시 알림 권한 요청 (한 번만 뜸)
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // 사용자 거절/브라우저 미지원 → 조용히 무시
      });
    }
  }, []);

  const pause = useCallback(() => {
    if (status !== 'running' || deadlineRef.current == null) return;
    pausedRemainingRef.current = deadlineRef.current - Date.now();
    deadlineRef.current = null;
    setStatus('paused');
  }, [status]);

  const resume = useCallback(() => {
    if (status !== 'paused' || pausedRemainingRef.current == null) return;
    deadlineRef.current = Date.now() + pausedRemainingRef.current;
    pausedRemainingRef.current = null;
    setStatus('running');
  }, [status]);

  const reset = useCallback(() => {
    deadlineRef.current = null;
    pausedRemainingRef.current = null;
    setRemainingMs(totalSec * 1000);
    setStatus('idle');
  }, [totalSec]);

  const close = useCallback(() => {
    deadlineRef.current = null;
    pausedRemainingRef.current = null;
    setStatus('idle');
    setRemainingMs(lastPreset * 1000);
    setTotalSec(lastPreset);
  }, [lastPreset]);

  const progress =
    totalSec > 0 ? 1 - Math.max(0, Math.min(1, remainingMs / (totalSec * 1000))) : 0;
  const isDone = status === 'done';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div
        className={`pointer-events-auto flex w-full max-w-md flex-col gap-2 rounded-lg border p-3 shadow-lg backdrop-blur transition-colors ${
          isDone
            ? 'border-emerald-300 bg-emerald-50/95 dark:border-emerald-800 dark:bg-emerald-950/90'
            : 'border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95'
        }`}
      >
        {status === 'idle' ? (
          <IdleBar presets={PRESETS} lastPreset={lastPreset} onStart={start} />
        ) : (
          <ActiveBar
            status={status}
            remainingMs={remainingMs}
            totalSec={totalSec}
            progress={progress}
            onPause={pause}
            onResume={resume}
            onReset={reset}
            onRestart={() => start(lastPreset)}
            onClose={close}
          />
        )}
      </div>
    </div>
  );
}

function IdleBar({
  presets,
  lastPreset,
  onStart,
}: {
  presets: readonly number[];
  lastPreset: number;
  onStart: (sec: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Timer className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <span className="text-xs text-zinc-500 dark:text-zinc-400">휴식</span>
      <div className="flex flex-1 flex-wrap items-center gap-1">
        {presets.map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => onStart(sec)}
            className={`rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors ${
              sec === lastPreset
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {sec}초
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveBar({
  status,
  remainingMs,
  totalSec,
  progress,
  onPause,
  onResume,
  onReset,
  onRestart,
  onClose,
}: {
  status: Exclude<Status, 'idle'>;
  remainingMs: number;
  totalSec: number;
  progress: number;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onRestart: () => void;
  onClose: () => void;
}) {
  const isDone = status === 'done';
  const isPaused = status === 'paused';
  const display = isDone ? '완료!' : formatMMSS(remainingMs / 1000);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Timer
          className={`h-4 w-4 shrink-0 ${isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}
          aria-hidden
        />
        <span
          className={`text-lg font-semibold tabular-nums ${
            isDone
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-zinc-900 dark:text-zinc-100'
          }`}
        >
          {display}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          / {totalSec}초{isPaused ? ' · 일시정지' : ''}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {isDone ? (
            <>
              <IconButton onClick={onRestart} label="다시 시작">
                <RotateCcw className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton onClick={onClose} label="닫기">
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </>
          ) : (
            <>
              {isPaused ? (
                <IconButton onClick={onResume} label="재개">
                  <Play className="h-3.5 w-3.5" />
                </IconButton>
              ) : (
                <IconButton onClick={onPause} label="일시정지">
                  <Pause className="h-3.5 w-3.5" />
                </IconButton>
              )}
              <IconButton onClick={onReset} label="리셋">
                <RotateCcw className="h-3.5 w-3.5" />
              </IconButton>
              <IconButton onClick={onClose} label="닫기">
                <X className="h-3.5 w-3.5" />
              </IconButton>
            </>
          )}
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full transition-all duration-200 ${
            isDone ? 'bg-emerald-500' : 'bg-zinc-500 dark:bg-zinc-300'
          }`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {children}
    </button>
  );
}
