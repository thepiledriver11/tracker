"use client";
import { useEffect, useState } from "react";

// One-time hint, mobile Safari only, when not already installed to the home screen.
export function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("a2hs-dismissed")) return;
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      nav.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
    const ua = navigator.userAgent;
    const isIOSSafari = /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
    if (isIOSSafari && !standalone) setShow(true);
  }, []);

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-md p-4 text-center" style={{ background: "linear-gradient(168deg,rgba(255,255,255,.98),rgba(238,246,252,.94))", boxShadow: "var(--lift), var(--inner)" }}>
      <p className="text-xs font-semibold text-[var(--ink)]">
        Add to your home screen: tap <b>Share</b> ↑ then <b>Add to Home Screen</b>.
      </p>
      <button
        className="pill mt-3"
        onClick={() => {
          localStorage.setItem("a2hs-dismissed", "1");
          setShow(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
