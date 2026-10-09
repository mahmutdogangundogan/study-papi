import { Suspense } from "react";
import { logout } from "@/actions/auth";
import { DesktopNav, MobileNav } from "@/components/app-nav";
import { TimerProvider } from "@/components/timer-provider";
import { TimerChip } from "@/components/timer-ui";
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
      <header className="sticky top-0 z-20 border-b border-line bg-paper pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-8 px-4">
          <Logo href="/rooms" />
          <DesktopNav />
          <div className="ml-auto flex items-center gap-2">
            <TimerChip />
            <form action={logout}>
              <button
                type="submit"
                title={`Çıkış yap (@${user.username})`}
                className="grid size-10 place-items-center rounded-md text-ink-muted hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4" />
                </svg>
                <span className="sr-only">Çıkış yap</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-7 pb-28 md:pb-16">{children}</main>
      <MobileNav />
    </TimerProvider>
  );
}

function AppSkeleton() {
  return (
    <>
      <header className="h-16 border-b border-line" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-7">
        <p className="font-serif text-[15px] text-ink-muted italic">Defter açılıyor…</p>
      </main>
    </>
  );
}
