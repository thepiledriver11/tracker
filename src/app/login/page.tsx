"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      setError(true);
    } catch {
      setError(true);
    }
    setBusy(false);
  };

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-8">
      <svg viewBox="0 0 512 512" className="h-16 w-16">
        <rect width="512" height="512" rx="115" fill="#000" />
        <circle
          cx="256"
          cy="256"
          r="140"
          fill="none"
          stroke="#fff"
          strokeWidth="36"
          strokeLinecap="round"
          strokeDasharray="660 220"
          transform="rotate(-90 256 256)"
        />
        <path
          d="M198 262l42 42 78-88"
          fill="none"
          stroke="#fff"
          strokeWidth="36"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h1 className="mt-5 text-xl font-semibold">Goal Tracker</h1>
      <p className="mt-1 text-sm text-faint">Enter your password to continue</p>

      <input
        autoFocus
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setError(false);
        }}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Password"
        className={`mt-6 w-full max-w-xs rounded-xl border px-4 py-3 text-center text-sm outline-none placeholder:text-faint focus:border-black ${
          error ? "border-black" : "border-line"
        }`}
      />
      {error && (
        <p className="mt-2 text-xs font-medium">Wrong password — try again.</p>
      )}
      <button
        onClick={submit}
        disabled={!password || busy}
        className="mt-4 w-full max-w-xs rounded-full bg-black py-3 text-sm text-white disabled:opacity-30"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="mt-4 text-center text-xs text-faint">
        You&apos;ll stay signed in on this device.
      </p>
    </main>
  );
}
