"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fig, fmt } from "./ui";
import { shortDate } from "@/lib/time";

export function LastSessionCard({
  summary,
}: {
  summary: { id: string; date: string; name: string; volume: number; e1rm: number };
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    try {
      await fetch(`/api/sessions/${summary.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-sm glass p-3.5">
      <div>
        <div className="text-[11px] font-bold">
          {shortDate(summary.date)} · {summary.name}
        </div>
        <div className="text-[10px] font-medium text-[var(--muted)]">
          {fmt(summary.volume)} kg total volume
        </div>
      </div>
      <Fig className="ml-auto text-lg" value={summary.e1rm} unit="e1rm" />
      {confirm ? (
        <div className="flex items-center gap-1.5">
          <button
            onClick={del}
            disabled={busy}
            className="rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
            style={{ background: "linear-gradient(140deg,#FF8A8A,#E85D5D)" }}
          >
            {busy ? "…" : "Delete"}
          </button>
          <button onClick={() => setConfirm(false)} className="text-[10px] font-semibold text-[var(--muted)]">
            Keep
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          aria-label="Delete session"
          className="text-[var(--muted)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-8 0v12a1 1 0 001 1h6a1 1 0 001-1V7" />
          </svg>
        </button>
      )}
    </div>
  );
}
