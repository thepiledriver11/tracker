"use client";

export function Donut({
  pct,
  size = 72,
  stroke = 7,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e5e5"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-500"
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        style={{ fontSize: size * 0.24, fontWeight: 600 }}
        className="fill-current"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

export function Bar({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <div className={`h-1.5 w-full rounded-full bg-line ${className}`}>
      <div
        className="h-full rounded-full bg-black transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}
