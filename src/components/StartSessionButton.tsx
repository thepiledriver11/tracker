"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartSessionButton({
  templateId,
  existingSessionId,
  completed,
}: {
  templateId: string;
  existingSessionId?: string | null;
  completed?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    if (existingSessionId) {
      router.push(`/session/${existingSessionId}`);
      return;
    }
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (data.id) router.push(`/session/${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  const label = completed
    ? "Review session"
    : existingSessionId
      ? "Continue session"
      : "Start session";

  return (
    <button
      onClick={start}
      disabled={busy}
      className="pill pill-jade mb-5 w-full disabled:opacity-60"
      style={{ padding: "16px", fontSize: 13 }}
    >
      {busy ? "…" : label}
    </button>
  );
}
