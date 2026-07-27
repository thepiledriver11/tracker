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
