import * as React from "react";

/** Big thin numeral with a superscript unit — the signature figure. */
export function Fig({
  value,
  unit,
  className = "",
  style,
}: {
  value: React.ReactNode;
  unit?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`fig ${className}`} style={style}>
      {value}
      {unit ? <span className="unit">{unit}</span> : null}
    </span>
  );
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

/** Format a number with thin-space thousands grouping, tabular. */
export function fmt(n: number): string {
  return n.toLocaleString("en-AU");
}

/** "$192,000" (AUD, no cents). compact → "$192k" / "$3.0m". */
export function fmtMoney(n: number, compact = false): string {
  const neg = n < 0;
  const v = Math.abs(Math.round(n));
  let body: string;
  if (compact) {
    if (v >= 1_000_000) body = `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}m`;
    else if (v >= 1000) body = `${Math.round(v / 1000)}k`;
    else body = `${v}`;
  } else {
    body = v.toLocaleString("en-AU");
  }
  return `${neg ? "−" : ""}$${body}`;
}

/** Big thin money figure with a small leading dollar sign. */
export function MoneyFig({
  value,
  className = "",
  compact = false,
  style,
}: {
  value: number;
  className?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}) {
  const s = fmtMoney(value, compact);
  return (
    <span className={`fig ${className}`} style={style}>
      {s}
    </span>
  );
}
