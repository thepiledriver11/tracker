"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type SettingsShape = {
  telegramChatId: string | null;
  morningPingAt: string;
  eveningNudgeAt: string;
  gymMode: boolean;
  notifyMorning: boolean;
  notifyNudge: boolean;
  notifyPr: boolean;
  notifyRecap: boolean;
};

export function SettingsClient({
  settings,
  target,
  botLinked,
}: {
  settings: SettingsShape;
  target: { calories: number; proteinG: number; carbsG: number | null; fatG: number | null } | null;
  botLinked: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [saving, setSaving] = useState(false);

  async function patch(partial: Partial<SettingsShape>) {
    const next = { ...s, ...partial };
    setS(next);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="title mb-4 text-2xl">Settings</h1>

      <Card title="Telegram">
        {settings.telegramChatId ? (
          <p className="text-xs font-medium text-[var(--jade-2)]">
            Linked ✓ chat {settings.telegramChatId}
          </p>
        ) : (
          <p className="text-xs font-medium text-[var(--ink-2)]">
            {botLinked
              ? "Bot configured. Send /start to your bot once, then reload — your chat links automatically."
              : "Set TELEGRAM_BOT_TOKEN in the environment, then message your bot with /start."}
          </p>
        )}
      </Card>

      <Card title="Notifications">
        <Toggle label="Morning ping" on={s.notifyMorning} onChange={(v) => patch({ notifyMorning: v })} />
        <TimeRow label="Morning at" value={s.morningPingAt} onChange={(v) => patch({ morningPingAt: v })} />
        <Toggle label="Evening nudge" on={s.notifyNudge} onChange={(v) => patch({ notifyNudge: v })} />
        <TimeRow label="Nudge at" value={s.eveningNudgeAt} onChange={(v) => patch({ eveningNudgeAt: v })} />
        <Toggle label="PR alerts" on={s.notifyPr} onChange={(v) => patch({ notifyPr: v })} />
        <Toggle label="Weekly recap" on={s.notifyRecap} onChange={(v) => patch({ notifyRecap: v })} />
      </Card>

      <Card title="Session">
        <Toggle label="Gym mode (dark session screen)" on={s.gymMode} onChange={(v) => patch({ gymMode: v })} />
      </Card>

      <NutritionTargetForm target={target} onSaved={() => router.refresh()} />

      <Card title="Data">
        <a href="/api/export" className="pill mb-2 block w-full text-center" style={{ padding: 12 }}>
          Export everything (JSON)
        </a>
        <button
          className="pill block w-full text-center"
          style={{ padding: 12 }}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </Card>

      {saving && <p className="text-center text-[10px] text-[var(--muted)]">Saving…</p>}
    </div>
  );
}

function NutritionTargetForm({
  target,
  onSaved,
}: {
  target: { calories: number; proteinG: number; carbsG: number | null; fatG: number | null } | null;
  onSaved: () => void;
}) {
  const [cal, setCal] = useState(String(target?.calories ?? ""));
  const [pro, setPro] = useState(String(target?.proteinG ?? ""));
  const [carb, setCarb] = useState(String(target?.carbsG ?? ""));
  const [fat, setFat] = useState(String(target?.fatG ?? ""));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/nutrition/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: parseInt(cal, 10) || 0,
          proteinG: parseInt(pro, 10) || 0,
          carbsG: carb ? parseInt(carb, 10) : null,
          fatG: fat ? parseInt(fat, 10) : null,
        }),
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const F = (v: string, set: (x: string) => void, ph: string) => (
    <input inputMode="numeric" value={v} onChange={(e) => set(e.target.value)} placeholder={ph} className="w-full rounded-sm p-2.5" style={{ background: "rgba(255,255,255,.65)", boxShadow: "var(--inner)", fontSize: 16 }} />
  );

  return (
    <Card title="Nutrition target">
      <div className="mb-2 grid grid-cols-2 gap-2">
        {F(cal, setCal, "kcal")}
        {F(pro, setPro, "protein g")}
        {F(carb, setCarb, "carbs g")}
        {F(fat, setFat, "fat g")}
      </div>
      <button className="pill pill-jade w-full disabled:opacity-60" style={{ padding: 12 }} onClick={save} disabled={busy}>
        {busy ? "…" : "Save target"}
      </button>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mb-4 p-5">
      <div className="eyebrow mb-3">{title}</div>
      {children}
    </section>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] font-semibold text-[var(--ink)]">{label}</span>
      <button
        onClick={() => onChange(!on)}
        aria-pressed={on}
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: on ? "linear-gradient(140deg,var(--jade),var(--jade-2))" : "rgba(147,169,191,.4)" }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: on ? "translateX(22px)" : "translateX(2px)", boxShadow: "0 2px 5px rgba(0,0,0,.2)" }}
        />
      </button>
    </div>
  );
}

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[12px] font-semibold text-[var(--ink)]">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm px-2 py-1"
        style={{ background: "rgba(255,255,255,.65)", boxShadow: "var(--inner)", fontSize: 16 }}
      />
    </div>
  );
}
