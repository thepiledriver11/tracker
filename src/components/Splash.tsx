"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

/** Full-screen loading overlay with the animated logo. Rendered on every hard
 * load (cold start, and the post-login navigation) and fades out once the app
 * underneath has hydrated. */
export default function Splash() {
  const [hiding, setHiding] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const hide = setTimeout(() => setHiding(true), 650);
    const remove = setTimeout(() => setGone(true), 1050);
    return () => {
      clearTimeout(hide);
      clearTimeout(remove);
    };
  }, []);

  if (gone) return null;
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-white transition-opacity duration-400 ${
        hiding ? "opacity-0" : "opacity-100"
      }`}
    >
      <Logo size={84} spinning />
    </div>
  );
}
