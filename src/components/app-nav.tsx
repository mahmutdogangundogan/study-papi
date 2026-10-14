"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseItems = [
  {
    href: "/rooms",
    label: "Odalarım",
    match: (p: string) => p === "/rooms" || (p.startsWith("/rooms/") && p !== "/rooms/new"),
    // açık defter
    icon: "M3 5.5C5.5 4.5 8.5 4.5 12 6.5c3.5-2 6.5-2 9-1V19c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1zM12 6.5V20",
  },
  {
    href: "/explore",
    label: "Keşfet",
    match: (p: string) => p.startsWith("/explore"),
    icon: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5 20 20",
  },
  {
    href: "/rooms/new",
    label: "Oda aç",
    match: (p: string) => p === "/rooms/new",
    // dolma kalem
    icon: "M14.5 4.5l5 5L9 20H4v-5zM12.5 6.5l5 5",
  },
];

// Profil kişiye özel: href kullanıcı adını içerir
function navItems(username: string) {
  return [
    ...baseItems,
    {
      href: `/profile/${username}`,
      label: "Profil",
      match: (p: string) => p === "/profile" || p === `/profile/${username}`,
      // baş ve omuzlar
      icon: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4.5 20c.8-3.5 3.8-6 7.5-6s6.7 2.5 7.5 6",
    },
  ];
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function DesktopNav({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-6 md:flex">
      {navItems(username).map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative pb-1.5 text-[15px] font-medium ${active ? "text-ink" : "text-ink-muted hover:text-ink"}`}
          >
            {item.label}
            {active && <span className="squiggle absolute inset-x-0 -bottom-0.5 h-1.5" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-sheet pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-4">
        {navItems(username).map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[12px] font-medium ${
                  active ? "text-ink" : "text-ink-muted"
                }`}
              >
                <Icon d={item.icon} />
                <span className="relative pb-1.5">
                  {item.label}
                  <span className={`squiggle absolute inset-x-0 -bottom-0.5 h-1.5 ${active ? "" : "invisible"}`} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
