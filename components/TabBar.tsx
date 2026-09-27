"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChart, IconDumbbell, IconFood, IconHome, IconList, IconUser } from "./icons";

const TABS = [
  { href: "/home", label: "Home", Icon: IconHome },
  { href: "/workout", label: "Workout", Icon: IconDumbbell },
  { href: "/diet", label: "Diet", Icon: IconFood },
  { href: "/planner", label: "Planner", Icon: IconList },
  { href: "/profile", label: "Profile", Icon: IconUser },
];

export function ProgressTabLink() {
  return { href: "/progress", Icon: IconChart };
}

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0c0c0e]/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-[430px] grid-cols-5 px-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`tab-press flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? "text-white" : "text-white/35"
              }`}
            >
              <span
                className={`rounded-2xl px-4 py-1.5 transition-all ${
                  active ? "pop-in bg-white text-black" : ""
                }`}
              >
                <Icon width={21} height={21} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
