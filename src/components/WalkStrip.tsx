"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fig } from "./ui";

export function WalkStrip({
  iso,
  minutes,
  target,
  isLong,
}: {
  iso: string;
  minutes: number;
  target: number;
  isLong: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const logged = minutes > 0;

  async function quickAdd() {
    if (busy || logged) return;
    setBusy(true);
    try {
      await fetch("/api/walks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          iso,
          minutes: target,
          kind: isLong ? "long" : "weekday",
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-2.5 flex items-center gap-3 rounded-sm glass p-3.5">
      <div
        className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[10px]"
        style={{ background: "var(--jade-wash)", color: "var(--jade-2)" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M13 4a1 1 0 100-.01M11 21l1-6-3-2 1-5 4 2 3 1M8 21l2-5" />
        </svg>
      </div>
      <div>
        <div className="text-[11px] font-bold">Walk</div>
        <div className="text-[10px] font-medium text-[var(--muted)]">
          {logged ? "Logged today" : `${target} min target`}
        </div>
      </div>
      <div className="ml-auto">
        {logged ? (
          <Fig className="text-xl" value={minutes} unit="min" />
        ) : (
          <button
            onClick={quickAdd}
            disabled={busy}
            className="pill"
            style={{ padding: "8px 13px" }}
          >
            {busy ? "…" : `+ ${target}`}
          </button>
        )}
      </div>
    </div>
  );
}
