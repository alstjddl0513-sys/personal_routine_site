'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Plus } from 'lucide-react';
import type { ExerciseStatsPR, PreviousWorkout, WorkoutSet } from '@repo/shared';
import { batchWorkoutSets, type WorkoutSetInput } from '../../lib/api';

// BatchWorkoutSetsDto setNumber @Max(20)과 맞춤.
const MAX_SETS = 20;

type Field = 'weight' | 'reps' | 'rir';

interface Row {
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
}

/** 저장된 세트(무게·횟수가 둘 다 있는 것) — 카드 정보 줄 PR 갱신용 */
export interface SavedSet {
  weightKg: number;
  reps: number;
}

interface Props {
  exerciseId: string;
  defaultSets: number;
  existingSets: WorkoutSet[];
  ensureSession: () => Promise<string>;
  showRir: boolean;
  onToggleRir: () => void;
  /** 같은 종목의 지난번 기록 — 있으면 '지난번' 열 */
  previous: PreviousWorkout | null;
  /** 오늘 전까지의 최고 기록 — 넘긴 세트에 "최고" 꼬리표 */
  pr: ExerciseStatsPR | null;
  onSaved: (sets: SavedSet[]) => void;
}

class InputError extends Error {}

function initRows(defaultSets: number, existing: WorkoutSet[]): Row[] {
  const highest = existing.reduce((m, s) => Math.max(m, s.setNumber), 0);
  const n = Math.max(defaultSets, highest);
  const rows: Row[] = [];
  for (let i = 1; i <= n; i++) {
    const s = existing.find((x) => x.setNumber === i);
    rows.push({
      setNumber: i,
      weight: s?.weightKg != null ? String(Number(s.weightKg)) : '',
      reps: s?.reps != null ? String(s.reps) : '',
      rir: s?.rir != null ? String(s.rir) : '',
    });
  }
  return rows;
}

function rowKey(r: Row): string {
  return `${r.weight}|${r.reps}|${r.rir}`;
}

function rowsSignature(rows: Row[]): string {
  return rows.map((r) => `${r.setNumber}|${rowKey(r)}`).join(';');
}

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function savedSets(rows: Row[]): SavedSet[] {
  return rows
    .map((r) => ({ weightKg: num(r.weight), reps: num(r.reps) }))
    .filter((s): s is SavedSet => s.weightKg != null && s.reps != null);
}

// "60 × 10" — 단위 없이 (열 머리가 무게(kg)·횟수라서).
function formatPrevSet(w: number | null, r: number | null): string {
  if (w == null && r == null) return '—';
  if (w == null) return `${r}회`;
  if (r == null) return `${w}kg`;
  return `${w} × ${r}`;
}

interface Change {
  text: string;
  up: boolean;
}

// 지난번 같은 번호 세트와 비교 — 무게·횟수를 따로, 바뀐 것만. 늘면 "+2.5kg", 줄면 "−4회".
// (예전엔 무게가 늘면 무게만 보여서 횟수가 줄어도 좋아진 것처럼 보였음) 추정값(1RM) X.
function changes(
  w: number | null,
  r: number | null,
  pw: number | null,
  pr: number | null,
): Change[] {
  const out: Change[] = [];
  if (w != null && pw != null && w !== pw) {
    const d = Math.round(Math.abs(w - pw) * 100) / 100;
    out.push({ text: `${w > pw ? '+' : '−'}${d}kg`, up: w > pw });
  }
  if (r != null && pr != null && r !== pr) {
    out.push({ text: `${r > pr ? '+' : '−'}${Math.abs(r - pr)}회`, up: r > pr });
  }
  return out;
}

// PR(오늘 전까지 최고)을 넘김: 더 무겁거나, 같은 무게로 횟수가 더 많음.
function beatsPr(w: number | null, r: number | null, pr: ExerciseStatsPR | null): boolean {
  if (!pr || w == null || r == null) return false;
  const pw = Number(pr.weightKg);
  if (w > pw) return true;
  return w === pw && pr.reps != null && r > pr.reps;
}

// RIR 열 머리 + 설명 풍선. 데스크톱은 hover · 포커스에 뜨고, 모바일은 누르면 열림(바깥을 누르거나
// Esc로 닫힘 — iOS는 버튼을 눌러도 포커스가 안 가서 상태로 엶). 풍선은 오른쪽 맞춤 · 최대 240px라
// 화면 밖으로 안 나감. 모바일은 밝은 바탕(surface · line · 그림자), 데스크톱은 어두운 풍선 그대로.
function RirHeader({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <span ref={ref} className="group/rir relative flex justify-center">
      <button
        type="button"
        aria-describedby={id}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-8 cursor-help items-center gap-0.5 font-medium text-ink-muted hover:text-ink focus-visible:text-ink max-md:font-semibold"
      >
        RIR
        <Info className="h-3 w-3" aria-hidden />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute top-full right-0 z-20 mt-1.5 w-max max-w-60 rounded-md px-3 py-2 text-left font-normal tracking-normal break-keep shadow-lg transition-opacity max-md:border max-md:border-line max-md:bg-surface max-md:text-[12.5px] max-md:leading-normal max-md:text-ink-soft md:bg-ink md:text-[13px] md:leading-normal md:text-paper md:group-focus-within/rir:visible md:group-focus-within/rir:opacity-100 md:group-hover/rir:visible md:group-hover/rir:opacity-100 ${
          open ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        몇 회 더 할 수 있었는지 적어요. 0이면 끝까지 한 거예요.
      </span>
    </span>
  );
}

export function SetInputs(props: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => initRows(props.defaultSets, props.existingSets));
  // 마지막으로 저장된 줄 — 저장 실패 시 "저장 안 된 줄"을 가려내는 기준.
  const [savedRows, setSavedRows] = useState<Row[]>(() =>
    initRows(props.defaultSets, props.existingSets),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ kind: 'input' | 'save'; message: string } | null>(null);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  // Enter로 세트를 추가한 뒤 새 줄 무게 칸으로 포커스 — 그 칸이 붙는 순간(ref 콜백).
  const focusOnMount = useRef<string | null>(null);

  const lastSavedSig = rowsSignature(savedRows);

  // Resync when server props change (reorder / another card's save →
  // router.refresh re-fetches everything). Guard against wiping in-flight
  // typing: if the local sig differs from lastSaved, the user is mid-edit.
  // React 19 "adjust state during render" pattern instead of useEffect.
  const [prevDefaults, setPrevDefaults] = useState(props.defaultSets);
  const [prevExisting, setPrevExisting] = useState(props.existingSets);
  if (
    props.defaultSets !== prevDefaults ||
    props.existingSets !== prevExisting
  ) {
    setPrevDefaults(props.defaultSets);
    setPrevExisting(props.existingSets);
    if (rowsSignature(rows) === lastSavedSig) {
      const next = initRows(props.defaultSets, props.existingSets);
      setRows(next);
      setSavedRows(next);
      setError(null);
    }
  }

  function update(idx: number, field: Field, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  // 그날만 한 세트 더 — 종목 기본 세트 수는 그대로. 빈 줄은 commit에서
  // 걸러져 저장 안 되고, 다음 서버 resync 때 사라짐.
  function addSet(): boolean {
    const last = rows.at(-1)?.setNumber ?? 0;
    if (last >= MAX_SETS) return false;
    setRows((prev) => [...prev, { setNumber: last + 1, weight: '', reps: '', rir: '' }]);
    return true;
  }

  async function commit() {
    const sig = rowsSignature(rows);
    if (sig === lastSavedSig) {
      // 틀린 값을 지워 저장본과 같아지면 오류도 지움(예전엔 저장할 게 없어 오류가 남아 있었음)
      setError(null);
      return;
    }
    setError(null);
    setSaving(true);
    const snapshot = rows;
    try {
      const payload: WorkoutSetInput[] = snapshot
        .map((r) => ({
          setNumber: r.setNumber,
          weightKg: r.weight.trim() === '' ? null : Number(r.weight),
          reps: r.reps.trim() === '' ? null : Number(r.reps),
          rir: r.rir.trim() === '' ? null : Number(r.rir),
        }))
        .filter((s) => s.weightKg != null || s.reps != null || s.rir != null);

      // 서버 규칙(BatchWorkoutSetsDto)과 같은 범위를 먼저 확인 — 넘으면 서버가 거절해서
      // "저장하지 못했어요"만 보이게 됨. 이유를 바로 알려줌.
      for (const s of payload) {
        if (
          s.weightKg != null &&
          (!Number.isFinite(s.weightKg) ||
            s.weightKg < 0 ||
            s.weightKg > 9999.99 ||
            // 소수 둘째 자리까지 (곱셈 비교는 62.3 같은 값에서 부동소수점 오차가 남)
            !/^\d+(\.\d{1,2})?$/.test(String(s.weightKg)))
        ) {
          throw new InputError('무게는 0~9999.99 사이 숫자로 적어주세요');
        }
        if (s.reps != null && (!Number.isInteger(s.reps) || s.reps < 0 || s.reps > 999)) {
          throw new InputError('횟수는 0~999 사이 정수로 적어주세요');
        }
        if (s.rir != null && (!Number.isInteger(s.rir) || s.rir < 0 || s.rir > 10)) {
          throw new InputError('RIR은 0~10 사이 정수로 적어주세요');
        }
      }

      const sessionId = await props.ensureSession();
      await batchWorkoutSets({
        sessionId,
        exerciseId: props.exerciseId,
        sets: payload,
      });
      setSavedRows(snapshot);
      props.onSaved(savedSets(snapshot));
      // Backend may auto-delete the session when it ends up empty (no sets, no
      // note). Refresh so the parent re-fetches — otherwise UI still points to
      // a session id that no longer exists.
      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof InputError
          ? { kind: 'input', message: err.message }
          : { kind: 'save', message: '저장하지 못했어요.' },
      );
    } finally {
      setSaving(false);
    }
  }

  const fields: Field[] = props.showRir ? ['weight', 'reps', 'rir'] : ['weight', 'reps'];

  // Enter = 다음 칸(무게 → 횟수 → RIR → 다음 세트 무게). 마지막 칸이면 세트 추가.
  function onEnter(idx: number, field: Field) {
    const fi = fields.indexOf(field);
    if (fi < fields.length - 1) {
      inputRefs.current.get(`${idx}:${fields[fi + 1]}`)?.focus();
      return;
    }
    if (idx < rows.length - 1) {
      inputRefs.current.get(`${idx + 1}:weight`)?.focus();
      return;
    }
    if (addSet()) focusOnMount.current = `${idx + 1}:weight`;
  }

  const prevBySet = new Map(
    (props.previous?.sets ?? []).map((s) => [
      s.setNumber,
      { w: s.weightKg != null ? Number(s.weightKg) : null, r: s.reps },
    ]),
  );
  const hasPrev = prevBySet.size > 0;
  // "최고" 꼬리표는 오늘 세트 중 가장 높은 한 세트(무게 → 횟수, 같으면 앞 세트)가
  // 오늘 이전 최고를 넘었을 때 그 세트에만 — 넘은 세트마다 붙이면 오늘 더 높은
  // 세트가 있어도 낮은 세트에 "최고"가 붙음.
  let bestIdx = -1;
  rows.forEach((r, i) => {
    const w = num(r.weight);
    const n = num(r.reps);
    if (w == null || n == null) return;
    const b = bestIdx >= 0 ? rows[bestIdx] : null;
    const bw = b ? num(b.weight)! : -1;
    const bn = b ? num(b.reps)! : -1;
    if (w > bw || (w === bw && n > bn)) bestIdx = i;
  });
  const prIdx =
    bestIdx >= 0 && beatsPr(num(rows[bestIdx].weight), num(rows[bestIdx].reps), props.pr)
      ? bestIdx
      : -1;
  // 저장 실패 시 저장 안 된 줄 = 마지막 저장본과 값이 다른 줄.
  const savedByNumber = new Map(savedRows.map((r) => [r.setNumber, rowKey(r)]));
  const unsaved = (r: Row) =>
    savedByNumber.get(r.setNumber) !== rowKey(r) && (r.weight !== '' || r.reps !== '' || r.rir !== '');
  const firstFailedIdx = error ? rows.findIndex(unsaved) : -1;

  // 모든 카드 같은 열 — 번호 22 · 무게 76 · 횟수 60 · (RIR 48) · 최근 기록(나머지, 왼쪽 정렬).
  // 3열 그리드에서 카드마다 칸 폭이 달라 줄이 안 맞아 보이지 않게, 기록이 없는 카드도
  // 입력칸을 넓히지 않고 남는 열은 비워 둠.
  const cols = ['22px', '76px', '60px', props.showRir ? '48px' : null, 'minmax(0,1fr)']
    .filter(Boolean)
    .join(' ');
  // 모바일: [세트 26][무게 1fr][횟수 1fr]([RIR 52])[지난번 76 · RIR을 켜면 68]. 지난 기록이 없으면
  // 지난번 열을 빼서 입력칸이 넓어짐(docs/design/rally-mobile-workouts).
  const mobileCols = [
    '26px',
    'minmax(0,1fr)',
    'minmax(0,1fr)',
    props.showRir ? '52px' : null,
    hasPrev ? (props.showRir ? '68px' : '76px') : null,
  ]
    .filter(Boolean)
    .join(' ');
  const gridStyle = { '--cols-m': mobileCols, '--cols-d': cols } as CSSProperties;
  const GRID = 'grid grid-cols-(--cols-m) gap-2 md:grid-cols-(--cols-d)';
  const atMax = (rows.at(-1)?.setNumber ?? 0) >= MAX_SETS;
  // "11.13" — 모바일 지난번 열 머리(정보 줄 '최근 기록' 날짜를 여기로 옮김)
  const prevDate = props.previous
    ? `${Number(props.previous.date.slice(5, 7))}.${props.previous.date.slice(8, 10)}`
    : null;

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div
        className={`${GRID} items-center text-xs font-medium text-ink-muted max-md:text-[11.5px] max-md:font-semibold max-md:tracking-[0.02em]`}
        style={gridStyle}
      >
        <span className="text-center md:invisible">세트</span>
        <span className="text-center">무게(kg)</span>
        <span className="text-center">횟수</span>
        {props.showRir ? <RirHeader id={`rir-tip-${props.exerciseId}`} /> : null}
        {/* 정보 줄 '최근 기록'(날짜)과 같은 이름 — 그날 같은 번호 세트 값. 모바일은 "지난번 11.13" */}
        <span className={`pl-2 max-md:pl-0 max-md:text-right ${hasPrev ? '' : 'max-md:hidden'}`}>
          {hasPrev ? (
            <>
              <span className="max-md:hidden">최근 기록</span>
              <span className="md:hidden">
                지난번 <span className="font-normal text-icon-faint">{prevDate}</span>
              </span>
            </>
          ) : null}
        </span>
      </div>
      {rows.map((row, idx) => {
        const filled = row.weight.trim() !== '' && row.reps.trim() !== '';
        const focused = focusedRow === idx;
        const failed = error != null && unsaved(row);
        const w = num(row.weight);
        const r = num(row.reps);
        const prev = prevBySet.get(row.setNumber) ?? null;
        const diff = prev ? changes(w, r, prev.w, prev.r) : [];
        const isPr = idx === prIdx;
        // 칸 모양으로만 상태 구분(줄 배경 X): 적은 세트 / 입력 중 줄 / 빈 세트, 실패는 alert.
        const box = failed
          ? 'border-alert bg-surface'
          : focused
            ? 'border-btn-border bg-surface'
            : filled
              ? 'border-divider bg-thead font-semibold'
              : 'border-dashed border-btn-border bg-transparent';
        return (
          <div key={row.setNumber} className="flex flex-col gap-1">
            <div
              className={`${GRID} items-center max-md:min-h-12.5`}
              style={gridStyle}
              onFocus={() => setFocusedRow(idx)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setFocusedRow((f) => (f === idx ? null : f));
                }
              }}
            >
              <span
                className={`text-center text-[13px] max-md:text-sm ${
                  focused ? 'font-bold text-heading max-md:text-chip-on-fg' : 'text-ink-muted max-md:font-medium'
                }`}
              >
                {row.setNumber}
              </span>
              {fields.map((field) => (
                <input
                  key={field}
                  ref={(el) => {
                    const k = `${idx}:${field}`;
                    if (el) {
                      inputRefs.current.set(k, el);
                      if (focusOnMount.current === k) {
                        focusOnMount.current = null;
                        el.focus();
                      }
                    } else inputRefs.current.delete(k);
                  }}
                  type="text"
                  inputMode={field === 'weight' ? 'decimal' : 'numeric'}
                  value={row[field]}
                  onChange={(e) => update(idx, field, e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onEnter(idx, field);
                    }
                  }}
                  aria-label={`${row.setNumber}세트 ${
                    field === 'weight' ? '무게' : field === 'reps' ? '횟수' : 'RIR'
                  }`}
                  className={`h-11 w-full min-w-0 rounded-md border px-1 text-center text-[15px] text-ink outline-none focus:border-transparent focus:ring-2 focus:ring-chip-on-border max-md:text-base max-md:font-semibold md:h-10 ${box}`}
                />
              ))}
              {/* 최근 기록 — 입력칸 바로 옆에 붙여 오늘 값과 눈이 바로 오감(왼쪽 정렬).
                  모바일은 오른쪽 맞춤 12px, 지난 기록이 없으면 열째 빠짐 */}
              <span
                className={`flex min-w-0 flex-col pl-2 leading-tight max-md:items-end max-md:pl-0 max-md:text-right ${
                  hasPrev ? '' : 'max-md:hidden'
                }`}
              >
                {hasPrev ? (
                  <span className="text-[12.5px] whitespace-nowrap text-ink-muted max-md:text-xs">
                    {prev ? formatPrevSet(prev.w, prev.r) : '—'}
                  </span>
                ) : null}
                {/* 값 아래 한 줄: "최고" → 늘어난 것(primary 600) → 줄어든 것(ink-faint) */}
                {isPr || diff.length > 0 ? (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] max-md:justify-end max-md:text-xs">
                    {isPr ? (
                      <span className="rounded border border-chip-on-border bg-chip-on-bg px-1 text-[10.5px] leading-[1.4] font-bold text-chip-on-fg">
                        최고
                      </span>
                    ) : null}
                    {[...diff.filter((c) => c.up), ...diff.filter((c) => !c.up)].map((c) => (
                      <span
                        key={c.text}
                        className={`whitespace-nowrap ${c.up ? 'font-semibold text-primary' : 'font-normal text-ink-faint'}`}
                      >
                        {c.text}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            </div>
            {idx === firstFailedIdx && error ? (
              <p className="flex items-center gap-2 pl-8 text-[13px] text-alert" role="alert">
                {error.message}
                {error.kind === 'save' ? (
                  <button
                    type="button"
                    onClick={commit}
                    disabled={saving}
                    className="min-h-8 cursor-pointer font-semibold text-alert underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    다시 시도
                  </button>
                ) : null}
              </p>
            ) : null}
          </div>
        );
      })}
      {error && firstFailedIdx === -1 ? (
        <p className="text-[13px] text-alert" role="alert">
          {error.message}
        </p>
      ) : null}
      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
        <span className="flex items-center gap-2">
          <button
            type="button"
            onClick={addSet}
            disabled={atMax}
            className="inline-flex min-h-10 cursor-pointer items-center gap-1 rounded-md border border-btn-border bg-btn-bg px-3 text-sm text-btn-fg hover:border-heading disabled:cursor-not-allowed disabled:border-divider disabled:text-icon-faint"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            세트 추가
          </button>
          {atMax ? <span className="text-[13px] text-ink-muted">세트는 20개까지예요.</span> : null}
          {saving ? <span className="text-[13px] text-ink-faint">저장 중…</span> : null}
        </span>
        <button
          type="button"
          onClick={props.onToggleRir}
          className="min-h-10 cursor-pointer px-1 text-[13px] text-ink-muted hover:text-ink"
        >
          {props.showRir ? 'RIR 숨기기' : '+ RIR'}
        </button>
      </div>
    </div>
  );
}
