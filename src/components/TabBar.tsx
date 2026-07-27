"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: React.ReactNode };

const I = (d: string) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const TABS: Tab[] = [
  { href: "/today", label: "Today", icon: I("M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1z") },
  { href: "/program", label: "Program", icon: I("M4 19V9m5 10V5m5 14v-7m5 7V8") },
  { href: "/progress", label: "Progress", icon: I("M4 12h3l3-7 4 14 3-7h3") },
  { href: "/body", label: "Body", icon: I("M12 21c4-3 6-6 6-9a6 6 0 10-12 0c0 3 2 6 6 9z") },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8l-1.4 1.4m-10 10l-1.4 1.4" />
      </svg>
    ),
  },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg items-center justify-around px-3 pt-3">
      <div className="glass flex w-full items-center justify-around rounded-md px-2 py-2.5">
        {TABS.map((t) => {
          const active = path === t.href || path.startsWith(t.href + "/");
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-label={t.label}
              className="flex flex-1 flex-col items-center gap-1 py-1"
              style={{ color: active ? "var(--jade-2)" : "var(--muted)" }}
            >
              {t.icon}
              <span className="text-[9px] font-bold uppercase tracking-wider">
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
