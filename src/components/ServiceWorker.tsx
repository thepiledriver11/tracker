"use client";
import { useEffect } from "react";

/** Registers the service worker and kicks the sync queue on reconnect/focus. */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* SW is an enhancement; ignore registration failures */
      });
    }

    // Lazily import the sync module so the app shell loads first.
    const flush = () => {
      import("@/lib/offline/sync").then((m) => m.flushQueue()).catch(() => {});
    };
    window.addEventListener("online", flush);
    window.addEventListener("focus", flush);
    flush();
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("focus", flush);
    };
  }, []);
  return null;
}
