"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SECTIONS } from "@/lib/store";
import { HomeIcon, SectionIcon } from "@/components/icons";

export default function TabBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const tab = (href: string, label: string, icon: React.ReactNode) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-1 flex-col items-center gap-1 py-2 ${
          active ? "text-black" : "text-faint"
        }`}
      >
        <span className="h-6 w-6">{icon}</span>
        <span className="text-[10px] leading-none">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white">
      <div className="mx-auto flex max-w-md items-stretch pb-[env(safe-area-inset-bottom)]">
        {tab("/", "Home", <HomeIcon className="h-6 w-6" />)}
        {SECTIONS.map((s) =>
          tab(
            `/${s.id}`,
            s.label,
            <SectionIcon section={s.id} className="h-6 w-6" />
          )
        )}
      </div>
    </nav>
  );
}
