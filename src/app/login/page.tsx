"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const PIN_LEN = 4;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/today";

  async function submit(value: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: value }),
      });
      if (res.ok) {
        router.replace(next);
        router.refresh();
      } else {
        setError("Wrong PIN");
        setPin("");
      }
    } catch {
      setError("Try again");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  function press(n: string) {
    if (busy) return;
    const nextPin = (pin + n).slice(0, PIN_LEN);
    setPin(nextPin);
    if (nextPin.length === PIN_LEN) submit(nextPin);
  }
  function back() {
    setError("");
    setPin((p) => p.slice(0, -1));
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-sm flex-col items-center justify-center px-8">
      <div className="eyebrow mb-2">Training Tracker</div>
      <h1 className="title mb-8 text-2xl">Enter PIN</h1>

      <div className="mb-2 flex gap-4">
        {Array.from({ length: PIN_LEN }).map((_, i) => (
          <span
            key={i}
            className="h-3.5 w-3.5 rounded-full"
            style={{
              background:
                i < pin.length
                  ? "linear-gradient(140deg,var(--jade),var(--jade-2))"
                  : "rgba(147,169,191,.35)",
              boxShadow: i < pin.length ? "0 6px 12px -6px rgba(23,186,132,.7)" : "none",
            }}
          />
        ))}
      </div>
      <div className="mb-8 h-5 text-sm font-semibold text-[var(--amber)]">
        {error}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <Key key={n} onClick={() => press(n)}>
            {n}
          </Key>
        ))}
        <div />
        <Key onClick={() => press("0")}>0</Key>
        <Key onClick={back} aria-label="Delete">
          ⌫
        </Key>
      </div>
    </main>
  );
}

function Key({
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      className="glass fig h-[68px] w-[68px] rounded-full text-3xl active:scale-95"
      style={{ transition: "transform .12s ease" }}
      {...rest}
    >
      {children}
    </button>
  );
}
