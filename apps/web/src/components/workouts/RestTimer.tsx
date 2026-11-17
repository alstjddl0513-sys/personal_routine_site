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

// 모바일 띠 — 머리 줄 [⏱ 휴식]으로 열고 띠의 ✕로 닫음. 새로고침하면 닫힌 채로(저장 X).
// active = 도는 중 · 멈춤 · 끝남 — 이때 [⏱ 휴식]을 눌러도 안 꺼지게(실수로 타이머가 사라지지 않게).
type MobileTimerState = { open: boolean; active: boolean };
const MOBILE_CLOSED: MobileTimerState = { open: false, active: false };
let mobileState: MobileTimerState = MOBILE_CLOSED;
const mobileListeners = new Set<() => void>();

function setMobileTimer(patch: Partial<MobileTimerState>) {
  const next = { ...mobileState, ...patch };
  if (next.open === mobileState.open && next.active === mobileState.active) return;
  mobileState = next;
  mobileListeners.forEach((l) => l());
}

function subscribeMobileTimer(cb: () => void): () => void {
  mobileListeners.add(cb);
  return () => {
    mobileListeners.delete(cb);
  };
}

function useMobileTimer(): MobileTimerState {
  return useSyncExternalStore(subscribeMobileTimer, () => mobileState, () => MOBILE_CLOSED);
}

// 모바일 머리 줄 오른쪽 [⏱ 휴식] — 띠가 열려 있으면 chip-on(눌린 상태).
export function RestTimerMobileButton() {
  const { open, active } = useMobileTimer();
  return (
    <button
      type="button"
      aria-pressed={open}
      onClick={() => {
        if (!active) setMobileTimer({ open: !open });
      }}
      className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-sm md:hidden ${
        open
          ? 'border-transparent bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
          : 'border-btn-border font-medium text-heading'
      }`}
    >
      <Timer className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
      휴식
    </button>
  );
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
  const bandOpen = useBandOpen();
  const mobile = useMobileTimer();
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
  }, [totalSec]);

  const close = useCallback(() => {
    deadlineRef.current = null;
    pausedRemainingRef.current = null;
    setStatus('idle');
    setRemainingMs(lastPreset * 1000);
    setTotalSec(lastPreset);
  }, [lastPreset]);

  // 머리 줄 [⏱ 휴식]이 도는 중엔 안 꺼지게 상태를 알림. 화면을 떠나면 띠도 닫힘.
  useEffect(() => {
    setMobileTimer({ active: status !== 'idle' });
  }, [status]);
  useEffect(() => () => setMobileTimer(MOBILE_CLOSED), []);

  return (
    <>
      {mobile.open ? (
        <MobileBand
          status={status}
          remainingMs={remainingMs}
          totalSec={totalSec}
          lastPreset={lastPreset}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onClose={() => {
            close();
            setMobileTimer({ open: false, active: false });
          }}
        />
      ) : null}

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
// 마지막에 쓴 프리셋 — 선택 상태(chip-on). 기본 버튼 색과 섞이지 않게 따로.
const BAND_BTN_ON =
  'inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md bg-chip-on-bg px-3 text-sm font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]';

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
                // 마지막에 쓴 시간 = 선택 상태로 — 굵기만 다르면 왜 굵은지 모름
                className={sec === lastPreset ? BAND_BTN_ON : BAND_BTN}
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

const BAND_ICON_BTN =
  'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-soft hover:bg-row-hover hover:text-ink';

// 모바일: 하단 탭 바로 위에 붙는 띠(docs/design/rally-mobile-workouts). 띠 하나가 고르기 → 도는 중 →
// 멈춤 → 끝남을 다 맡음. 본문 흐름에 띠 높이만큼 빈 자리를 둬서 마지막 [세트 추가]를 가리지 않음.
function MobileBand({
  status,
  remainingMs,
  totalSec,
  lastPreset,
  onStart,
  onPause,
  onResume,
  onClose,
}: {
  status: Status;
  remainingMs: number;
  totalSec: number;
  lastPreset: number;
  onStart: (sec: number) => void;
  onPause: () => void;
  onResume: () => void;
  onClose: () => void;
}) {
  const done = status === 'done';
  const paused = status === 'paused';
  const active = status === 'running' || paused;
  const remainRatio = totalSec > 0 ? Math.max(0, Math.min(1, remainingMs / (totalSec * 1000))) : 0;

  // 화면 읽기 프로그램엔 10초마다만 남은 시간을 알림(매초 읽으면 시끄러움)
  const sec = Math.ceil(remainingMs / 1000);
  const [live, setLive] = useState('');
  const nextLive =
    status === 'running' && sec > 0 && sec % 10 === 0
      ? `${formatMSS(sec)} 남음`
      : done
        ? '휴식 끝났어요'
        : paused
          ? '멈춤'
          : null;
  if (nextLive && nextLive !== live) setLive(nextLive);

  const closeBtn = (
    <button type="button" onClick={onClose} aria-label="휴식 닫기" className={BAND_ICON_BTN}>
      <X className="h-4.5 w-4.5" aria-hidden />
    </button>
  );

  return (
    <>
      <div aria-hidden className="h-14 md:hidden" />
      <section
        aria-label="휴식 타이머"
        className={`fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t font-plex md:hidden ${
          done ? 'border-chip-on-border bg-chip-on-bg' : 'border-line bg-surface'
        }`}
      >
        <span aria-live="polite" className="sr-only">
          {live}
        </span>
        {active ? (
          <span aria-hidden className="block h-0.75 bg-track">
            <span
              className={`block h-full transition-[width] duration-200 ${paused ? 'bg-btn-border' : 'bg-primary'}`}
              style={{ width: `${remainRatio * 100}%` }}
            />
          </span>
        ) : null}
        <div className="flex min-h-13 items-center gap-2 px-3.5 py-1.5">
          {done ? (
            <>
              <strong className="min-w-0 flex-1 text-[15px] font-bold text-heading">휴식 끝났어요</strong>
              <button
                type="button"
                onClick={() => onStart(lastPreset)}
                className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-btn-border bg-surface px-3 text-sm font-medium text-heading"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                다시 {lastPreset}초
              </button>
              {closeBtn}
            </>
          ) : active ? (
            <>
              <span
                role="timer"
                aria-label={`${formatMSS(totalSec)} 중 ${formatMSS(remainingMs / 1000)} 남음`}
                className="flex min-w-0 flex-1 items-baseline gap-2"
              >
                <span className={`text-xl leading-tight font-bold tracking-[0.01em] ${paused ? 'text-ink-muted' : 'text-ink'}`}>
                  {formatMMSS(remainingMs / 1000)}
                </span>
                <span className="text-[13px] text-ink-muted">
                  {paused ? `멈춤 · ${totalSec}초` : `${totalSec}초`}
                </span>
              </span>
              {paused ? (
                <button type="button" onClick={onResume} aria-label="이어서" className={BAND_ICON_BTN}>
                  <Play className="h-4.5 w-4.5" aria-hidden />
                </button>
              ) : (
                <button type="button" onClick={onPause} aria-label="멈춤" className={BAND_ICON_BTN}>
                  <Pause className="h-4.5 w-4.5" aria-hidden />
                </button>
              )}
              <button type="button" onClick={() => onStart(totalSec)} aria-label="처음부터 다시" className={BAND_ICON_BTN}>
                <RotateCcw className="h-4.5 w-4.5" aria-hidden />
              </button>
              {closeBtn}
            </>
          ) : (
            <>
              <span className="shrink-0 text-[13.5px] font-semibold text-ink-soft">휴식</span>
              <span className="flex min-w-0 flex-1 gap-1.5">
                {PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStart(s)}
                    className={`min-h-10 min-w-0 flex-1 cursor-pointer rounded-full text-sm ${
                      s === lastPreset
                        ? 'bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                        : 'border border-btn-border bg-surface text-ink-soft'
                    }`}
                  >
                    {s}초
                  </button>
                ))}
              </span>
              {closeBtn}
            </>
          )}
        </div>
      </section>
    </>
  );
}
