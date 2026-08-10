export function Logo({
  size = 64,
  spinning = false,
}: {
  size?: number;
  spinning?: boolean;
}) {
  return (
    <svg viewBox="0 0 512 512" style={{ width: size, height: size }}>
      <rect width="512" height="512" rx="115" fill="#000000" />
      <g
        className={spinning ? "logo-spin" : undefined}
        style={{ transformOrigin: "256px 256px" }}
      >
        <circle
          cx="256"
          cy="256"
          r="140"
          fill="none"
          stroke="#ffffff"
          strokeWidth="36"
          strokeLinecap="round"
          strokeDasharray="660 220"
          transform="rotate(-90 256 256)"
        />
      </g>
      <path
        d="M198 262l42 42 78-88"
        fill="none"
        stroke="#ffffff"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
