"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GridIcon } from "@/components/icons";

export default function HeaderMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // cookie may already be gone; go to login regardless
    }
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        className="p-1 -m-1"
      >
        <GridIcon className="h-6 w-6" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-8 z-30 w-40 rounded-xl border border-line bg-white py-1 shadow-sm">
            <button
              onClick={signOut}
              className="w-full px-4 py-2.5 text-left text-sm active:bg-neutral-50"
            >
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
