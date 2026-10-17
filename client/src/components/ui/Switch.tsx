'use client';

/** Công tắc bật/tắt theo kiểu iOS: nút trượt tròn trên nền bo. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-[var(--ok)]' : 'bg-surface-3'
        }`}
      >
        <span
          className={`absolute size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}