"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChart, IconDumbbell, IconFood, IconHome, IconUser } from "./icons";

const TABS = [
  { href: "/home", label: "Home", Icon: IconHome },
  { href: "/workout", label: "Workout", Icon: IconDumbbell },
  { href: "/diet", label: "Diet", Icon: IconFood },
  { href: "/progress", label: "Progress", Icon: IconChart },
  { href: "/profile", label: "Profile", Icon: IconUser },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink/90 backdrop-blur-xl" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-[430px] grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`tab-press flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-lime" : "text-white/40"
              }`}
            >
              <span className={`rounded-xl p-1 transition-all ${active ? "bg-lime/15 scale-110" : ""}`}>
                <Icon width={22} height={22} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
