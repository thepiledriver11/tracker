"use client";
import { useEffect, useState } from "react";
import { Fig } from "./ui";

/** Persistent bottom bar. Counts down from `seconds`; skip / +30s. */
export function RestTimer({
  seconds,
  onDone,
  onSkip,
}: {
  seconds: number;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => setRemaining(seconds), [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, onDone]);

  const mmss = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div
      className="mb-3 mt-auto flex items-center gap-3 rounded-md p-3.5"
      style={{
        background:
          "linear-gradient(140deg,rgba(67,223,162,.2),rgba(23,186,132,.07))",
        boxShadow: "var(--inner)",
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--jade-2)" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M9 2h6" />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-2)]">
        Rest
      </span>
      <Fig className="ml-auto text-xl" style={{ color: "var(--jade-2)" }} value={mmss} />
      <button
        className="pill"
        style={{ padding: "7px 12px", fontSize: 10 }}
        onClick={() => setRemaining((r) => r + 30)}
      >
        +30s
      </button>
      <button className="pill" style={{ padding: "7px 12px", fontSize: 10 }} onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
