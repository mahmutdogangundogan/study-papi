"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/rooms",
    label: "Odalarım",
    match: (p: string) => p === "/rooms" || (p.startsWith("/rooms/") && p !== "/rooms/new"),
    icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  },
  {
    href: "/explore",
    label: "Keşfet",
    match: (p: string) => p.startsWith("/explore"),
    icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm10 17-4.35-4.35",
  },
  {
    href: "/rooms/new",
    label: "Oda aç",
    match: (p: string) => p === "/rooms/new",
    icon: "M12 5v14M5 12h14",
  },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
            item.match(pathname) ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                item.match(pathname) ? "text-emerald-400" : "text-zinc-400"
              }`}
            >
              <Icon d={item.icon} />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
