import { Suspense } from "react";
import { logout } from "@/actions/auth";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { TimerProvider } from "@/components/timer-provider";
import { TimerPill } from "@/components/timer-ui";
import { Logo } from "@/components/ui/logo";
import { getTimerState } from "@/lib/data";
import { requireUser } from "@/lib/session";

// Bu alan tamamen kullanıcıya özel ve canlı (timer'lar), statik kabuğa alınacak bir şey yok
export const instant = false;

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <AppFrame>{children}</AppFrame>
    </Suspense>
  );
}

// Oturumu okuyan kısım Suspense içinde; timer state'i tüm sayfalarla paylaşılır
async function AppFrame({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const timer = await getTimerState(user.id);

  return (
    <TimerProvider initial={timer}>
      <header className="sticky top-0 z-20 border-b border-white/5 bg-zinc-950/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Logo href="/rooms" />
          <DesktopNav />
          <div className="ml-auto flex items-center gap-2">
            <TimerPill />
            <form action={logout}>
              <button
                type="submit"
                title={`Çıkış yap (@${user.username})`}
                className="grid size-9 place-items-center rounded-full text-zinc-400 ring-1 ring-white/10 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3" />
                </svg>
                <span className="sr-only">Çıkış yap</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 md:pb-12">{children}</main>
      <MobileNav />
    </TimerProvider>
  );
}

function AppSkeleton() {
  return (
    <>
      <header className="h-14 border-b border-white/5" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-3 px-4 pt-5">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/5" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
      </main>
    </>
  );
}
