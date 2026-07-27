"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ExercisePicker({
  exercises,
  selectedId,
}: {
  exercises: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const selected = exercises.find((e) => e.id === selectedId);
  const [open, setOpen] = useState(!selected);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(q.toLowerCase()),
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass mb-4 flex w-full items-center justify-between rounded-sm px-4 py-3"
      >
        <span className="title text-base">{selected?.name ?? "Pick exercise"}</span>
        <span className="text-[var(--muted)]">▾</span>
      </button>
    );
  }

  return (
    <div className="mb-4">
      <input
        autoFocus
        placeholder="Search exercises"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-2 w-full rounded-sm p-3"
        style={{ background: "rgba(255,255,255,.65)", boxShadow: "var(--inner)", fontSize: 16 }}
      />
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={() => {
              setOpen(false);
              router.push(`/progress?exerciseId=${e.id}`);
            }}
            className="glass mb-1.5 flex w-full items-center rounded-sm px-4 py-2.5 text-left text-sm font-semibold"
          >
            {e.name}
          </button>
        ))}
      </div>
    </div>
  );
}
