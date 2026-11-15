'use client';

// 켜고 끄는 스위치 — button(role=switch)이라 Space · Enter로 바로 토글.
// 누르는 영역 40px, 트랙 36×20(켜짐 primary / 꺼짐 btn-border / 잠김 divider) + 16px 원(surface, 잠김 thead).
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** 스크린리더용 이름(보이는 이름과 같게) */
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)] disabled:cursor-default"
    >
      <span
        aria-hidden
        className={`relative inline-flex h-5 w-9 items-center rounded-[10px] transition-colors ${
          disabled ? 'bg-divider' : checked ? 'bg-primary' : 'bg-btn-border'
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full shadow-sm transition-transform motion-reduce:transition-none ${
            disabled ? 'bg-thead' : 'bg-surface'
          } ${checked ? 'translate-x-4.5' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  );
}
