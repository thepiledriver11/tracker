"use client";

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="sheet-enter max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  autoFocus,
  hint,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  autoFocus?: boolean;
  hint?: string;
  onEnter?: () => void;
}) {
  return (
    <label className="mt-3 block first:mt-4">
      <span className="text-xs text-faint">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "decimal" : undefined}
        className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-black"
      />
      {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
    </label>
  );
}

export function SheetActions({
  onCancel,
  onConfirm,
  confirmLabel = "Save",
  disabled,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mt-5 flex gap-3">
      <button
        onClick={onCancel}
        className="flex-1 rounded-full border border-line py-2.5 text-sm"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="flex-1 rounded-full bg-black py-2.5 text-sm text-white disabled:opacity-30"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="mt-3 text-sm text-faint">{message}</p>
      <SheetActions
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmLabel={confirmLabel}
      />
    </Sheet>
  );
}

export const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
