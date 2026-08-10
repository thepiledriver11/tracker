"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTracker } from "@/lib/store";
import { HomeIcon, CategoryIcon } from "@/components/icons";

export default function TabBar() {
  const pathname = usePathname();
  const { state } = useTracker();
  if (pathname === "/login") return null;

  const homeActive = pathname === "/";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white">
      <div className="mx-auto max-w-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch overflow-x-auto no-scrollbar">
          <Link
            href="/"
            className={`flex min-w-[64px] flex-1 flex-col items-center gap-1 py-2 ${
              homeActive ? "text-black" : "text-faint"
            }`}
          >
            <HomeIcon className="h-6 w-6" />
            <span className="text-[10px] leading-none">Home</span>
          </Link>
          {state.categories.map((c) => {
            const href = `/${c.id}`;
            const active = pathname === href;
            return (
              <Link
                key={c.id}
                href={href}
                className={`flex min-w-[64px] flex-1 flex-col items-center gap-1 py-2 ${
                  active ? "text-black" : "text-faint"
                }`}
              >
                <CategoryIcon
                  icon={c.icon}
                  label={c.label}
                  className="h-6 w-6"
                />
                <span className="max-w-[64px] truncate text-[10px] leading-none">
                  {c.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
