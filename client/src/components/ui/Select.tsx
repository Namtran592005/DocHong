'use client';

/**
 * Combobox đơn giản dựa trên thẻ `<select>` gốc của trình duyệt: nhận được
 * bàn phím, đọc bằng trình đọc màn hình và bản địa hoá sẵn danh sách bật lên
 * trên mọi hệ điều hành — đúng như mong muốn cho một trường chọn kiểu iOS.
 */
export function Select({
  value,
  onChange,
  options,
  label,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  id: string;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-line bg-surface-2 pr-10 pl-3.5 text-sm font-medium text-fg outline-none transition-colors hover:border-line-strong focus:border-accent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface text-fg">
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-subtle"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
    </div>
  );
}