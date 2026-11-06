'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';

const PRESETS = [60, 90, 120, 180] as const;
const STORAGE_KEY = 'rally.restTimer.lastPreset';
const DEFAULT_PRESET = 90;
// 같은 탭 안에서도 setItem 이후 useSyncExternalStore가 재읽도록 broadcast.
const LAST_PRESET_CHANGE_EVENT = 'rally.restTimer.lastPresetChanged';

function readLastPreset(): number {
  if (typeof window === 'undefined') return DEFAULT_PRESET;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRESET;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_PRESET;
  } catch {
    return DEFAULT_PRESET;
  }
}

function subscribeLastPreset(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(LAST_PRESET_CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(LAST_PRESET_CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

const BAND_OPEN_KEY = 'rally.restTimer.bandOpen';
const BAND_OPEN_EVENT = 'rally.restTimer.bandOpenChanged';

function readBandOpen(): boolean {
  try {
    return window.localStorage.getItem(BAND_OPEN_KEY) !== '0';
  } catch {
    return true;
  }
}

function subscribeBandOpen(cb: () => void): () => void {
  window.addEventListener(BAND_OPEN_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(BAND_OPEN_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

function setBandOpen(open: boolean) {
  try {
    window.localStorage.setItem(BAND_OPEN_KEY, open ? '1' : '0');
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(BAND_OPEN_EVENT));
}

function useBandOpen(): boolean {
  return useSyncExternalStore(subscribeBandOpen, readBandOpen, () => true);
}

// 띠를 ✕로 닫았을 때만 헤더(날짜 이동 왼쪽)에 보이는 버튼. 데스크톱 전용.
export function RestTimerOpenButton() {
  const open = useBandOpen();
  if (open) return null;
  return (
    <button
      type="button"
      onClick={() => setBandOpen(true)}
      className="hidden min-h-10 cursor-pointer items-center gap-1.5 rounded-md border border-btn-border bg-btn-bg px-3.5 text-sm font-medium text-btn-fg hover:border-heading md:inline-flex"
    >
      <Timer className="h-4 w-4" aria-hidden />
      휴식 타이머
    </button>
  );
}

// "1:30"
function formatMSS(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

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
      new Notification('휴식 끝', {
        body,
        tag: 'rally-rest-timer',
        silent: true,
      });
    }
  } catch {
    // no-op
  }
}

export function RestTimer() {
  // lastPreset은 localStorage에서 hydration 후 자동 복원 (useSyncExternalStore).
  // 서버 스냅샷은 DEFAULT_PRESET이라 하이드 정합.
  const lastPreset = useSyncExternalStore<number>(
    subscribeLastPreset,
    readLastPreset,
    () => DEFAULT_PRESET,
  );
  const [status, setStatus] = useState<Status>('idle');
  const [totalSec, setTotalSec] = useState<number>(DEFAULT_PRESET);
  const [remainingMs, setRemainingMs] = useState<number>(DEFAULT_PRESET * 1000);
  // Mobile-only: collapse to a FAB when idle so the full preset bar
  // doesn't block content. Desktop always shows the full card (md:).
  // 사용자가 FAB 탭으로 명시적으로 펼친 여부만 저장 — 실제 노출은
  // status !== 'idle'로도 파생되어 non-idle 상태에서는 항상 보임.
  const [mobileUserExpanded, setMobileUserExpanded] = useState(false);
  const bandOpen = useBandOpen();
  // 실제 종료 시각(ms since epoch). setInterval은 백그라운드에서 스로틀되므로,
  // deadline 기준으로 남은 시간을 계산해 스로틀에 무관하게 정확도 유지.
  const deadlineRef = useRef<number | null>(null);
  // 일시정지 시점의 남은 ms를 저장해 resume에서 deadline 재계산.
  const pausedRemainingRef = useRef<number | null>(null);

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
        notifyIfAllowed(`${totalSec}초 휴식이 끝났어요.`);
        return;
      }
      setRemainingMs(rem);
    }, 200);
    return () => window.clearInterval(id);
  }, [status, totalSec]);

  const start = useCallback((sec: number) => {
    setTotalSec(sec);
    setRemainingMs(sec * 1000);
    deadlineRef.current = Date.now() + sec * 1000;
    pausedRemainingRef.current = null;
    setStatus('running');
    try {
      window.localStorage.setItem(STORAGE_KEY, String(sec));
      // 같은 탭의 useSyncExternalStore 구독자에게 알림 (storage 이벤트는 다른 탭만).
      window.dispatchEvent(new Event(LAST_PRESET_CHANGE_EVENT));
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
    // idle로 복귀하면 다시 FAB만 노출.
    setMobileUserExpanded(false);
  }, [totalSec]);

  const close = useCallback(() => {
    deadlineRef.current = null;
    pausedRemainingRef.current = null;
    setStatus('idle');
    setRemainingMs(lastPreset * 1000);
    setTotalSec(lastPreset);
    setMobileUserExpanded(false);
  }, [lastPreset]);

  const progress =
    totalSec > 0 ? 1 - Math.max(0, Math.min(1, remainingMs / (totalSec * 1000))) : 0;
  const isDone = status === 'done';
  // non-idle이거나 사용자가 명시 확장한 경우 카드 노출, 아니면 FAB.
  const mobileExpanded = status !== 'idle' || mobileUserExpanded;
  const showMobileFab = !mobileExpanded;

  return (
    <>
      {/* Mobile FAB — visible when idle+collapsed so preset bar doesn't
          block content. Tap to expand. Desktop always shows the card. */}
      {showMobileFab ? (
        <button
          type="button"
          onClick={() => setMobileUserExpanded(true)}
          aria-label="휴식 타이머"
          className="fixed bottom-24 left-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-lg backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-400"
        >
          <Timer className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div
        className={`pointer-events-none fixed inset-x-0 bottom-24 z-40 justify-center px-4 md:hidden ${
          showMobileFab ? 'hidden' : 'flex'
        }`}
      >
        <div
          className={`pointer-events-auto flex w-fit max-w-md flex-col gap-2 rounded-lg border p-3 shadow-lg backdrop-blur transition-colors ${
            isDone
              ? 'border-emerald-300 bg-emerald-50/95 dark:border-emerald-800 dark:bg-emerald-950/90'
              : 'border-zinc-200 bg-white/95 dark:border-zinc-800 dark:bg-zinc-950/95'
          }`}
        >
          {status === 'idle' ? (
            <IdleBar
              presets={PRESETS}
              lastPreset={lastPreset}
              onStart={start}
              onCollapseMobile={() => setMobileUserExpanded(false)}
            />
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

      {bandOpen ? (
        <DesktopBand
          status={status}
          remainingMs={remainingMs}
          totalSec={totalSec}
          lastPreset={lastPreset}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onReset={reset}
          onClose={() => {
            close();
            setBandOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

const BAND_BTN =
  'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md border border-btn-border bg-btn-bg px-3 text-sm text-btn-fg hover:border-heading';

// 데스크톱: 본문 열 바닥에 붙는 띠(사이드바 안 덮음). 흐름 안의 sticky라 맨 아래로
// 스크롤하면 띠가 마지막 카드 뒤에 놓여 입력칸을 가리지 않음.
function DesktopBand({
  status,
  remainingMs,
  totalSec,
  lastPreset,
  onStart,
  onPause,
  onResume,
  onReset,
  onClose,
}: {
  status: Status;
  remainingMs: number;
  totalSec: number;
  lastPreset: number;
  onStart: (sec: number) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const done = status === 'done';
  const active = status === 'running' || status === 'paused';
  const remainRatio = totalSec > 0 ? Math.max(0, Math.min(1, remainingMs / (totalSec * 1000))) : 0;

  return (
    <section
      aria-label="휴식 타이머"
      className={`sticky bottom-0 z-30 hidden border-t px-10 py-2.5 md:block ${
        done ? 'border-chip-on-border bg-chip-on-bg' : 'border-line bg-surface'
      }`}
    >
      <div className="mx-auto flex min-h-12 max-w-310 items-center gap-5">
        {done ? (
          <>
            <strong className="text-[22px] leading-tight font-bold text-heading">완료!</strong>
            <span className="text-sm text-ink-soft">{totalSec}초 휴식이 끝났어요.</span>
          </>
        ) : (
          <span className="text-sm font-semibold text-ink-soft">휴식</span>
        )}

        {active ? (
          <>
            <span
              role="timer"
              aria-label={`${formatMSS(totalSec)} 중 ${formatMSS(remainingMs / 1000)} 남음`}
              className="flex items-baseline gap-1.5"
            >
              <strong className="text-[26px] leading-tight font-bold text-ink">
                {formatMSS(remainingMs / 1000)}
              </strong>
              <span className="text-[15px] text-ink-muted">
                / {formatMSS(totalSec)}
                {status === 'paused' ? ' · 일시정지' : ''}
              </span>
            </span>
            <span className="block h-1.5 max-w-70 flex-[0_1_280px] bg-track">
              <span
                className="block h-full bg-primary transition-[width] duration-200"
                style={{ width: `${remainRatio * 100}%` }}
              />
            </span>
          </>
        ) : (
          <span className="flex items-center gap-2">
            {PRESETS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => onStart(sec)}
                className={`${BAND_BTN} ${sec === lastPreset ? 'font-semibold' : ''}`}
              >
                {sec}초
              </button>
            ))}
          </span>
        )}

        <span className="ml-auto flex items-center gap-2">
          {status === 'running' ? (
            <button type="button" onClick={onPause} className={BAND_BTN}>
              <Pause className="h-3.5 w-3.5" aria-hidden />
              일시정지
            </button>
          ) : null}
          {status === 'paused' ? (
            <button type="button" onClick={onResume} className={BAND_BTN}>
              <Play className="h-3.5 w-3.5" aria-hidden />
              재개
            </button>
          ) : null}
          {active ? (
            <button type="button" onClick={onReset} className={BAND_BTN}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              리셋
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="휴식 타이머 닫기"
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </span>
      </div>
    </section>
  );
}

function IdleBar({
  presets,
  lastPreset,
  onStart,
  onCollapseMobile,
}: {
  presets: readonly number[];
  lastPreset: number;
  onStart: (sec: number) => void;
  onCollapseMobile: () => void;
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
      <button
        type="button"
        onClick={onCollapseMobile}
        aria-label="타이머 접기"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 md:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
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
