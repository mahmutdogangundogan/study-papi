import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/ui/logo";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";
import { getCurrentUser } from "@/lib/session";

const features = [
  {
    title: "Tek tuşla başla",
    body: "Odaya gir, “Çalışmaya başla”ya bas. Timer’ın sayar, arkadaşların seni çalışırken görür.",
  },
  {
    title: "Tek timer, tüm odalar",
    body: "Timer sana ait. Üç odada olsan da tek timer’ın var ve hepsinde aynı anda görünürsün.",
  },
  {
    title: "Public ya da private",
    body: "Public odaları ara bul, private odalara davet linki ya da kodla katıl.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[28rem] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.25),transparent_65%)]"
      />
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Suspense fallback={null}>
          <HeaderAuthLink />
        </Suspense>
      </header>

      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-12 sm:px-6">
        <section className="pt-10 pb-12 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/20">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            Birlikte çalışmak daha kolay
          </p>
          <h1 className="mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-white sm:text-6xl">
            Arkadaşlarınla aynı odada,
            <br />
            <span className="text-emerald-400">kendi timer’ınla</span> çalış.
          </h1>
          <p className="mt-5 max-w-xl text-base text-zinc-400 sm:text-lg">
            Study Papi’de bir çalışma odası aç, arkadaşlarını davet et. Kim çalışıyor, ne zamandır
            çalışıyor, hepsini canlı gör.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:max-w-sm sm:flex-row">
            <Suspense
              fallback={
                <Link href="/register" className={primaryButtonClass}>
                  Hemen başla
                </Link>
              }
            >
              <HeroCta />
            </Suspense>
          </div>
        </section>

        <PreviewCard />

        <section className="mt-12 grid gap-3 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl bg-white/[0.03] p-5 ring-1 ring-white/10">
              <h2 className="font-semibold text-white">{f.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="relative border-t border-white/5 py-6 text-center text-xs text-zinc-500">
        Study Papi · odaklan, birlikte.
      </footer>
    </div>
  );
}

async function HeaderAuthLink() {
  const user = await getCurrentUser();
  return (
    <Link
      href={user ? "/rooms" : "/login"}
      className="rounded-full px-4 py-2 text-sm font-medium text-zinc-200 ring-1 ring-white/15 hover:bg-white/5"
    >
      {user ? "Odalarım" : "Giriş yap"}
    </Link>
  );
}

async function HeroCta() {
  const user = await getCurrentUser();
  if (user) {
    return (
      <Link href="/rooms" className={primaryButtonClass}>
        Odalarıma git
      </Link>
    );
  }
  return (
    <>
      <Link href="/register" className={primaryButtonClass}>
        Hemen başla
      </Link>
      <Link href="/login" className={`${secondaryButtonClass} w-full`}>
        Giriş yap
      </Link>
    </>
  );
}

// Uygulamanın nasıl göründüğüne dair statik bir önizleme
function PreviewCard() {
  const people = [
    { name: "Ayşe", time: "01:42:10", active: true },
    { name: "Mert", time: "00:37:55", active: true },
    { name: "Zeynep", time: null, active: false },
  ];
  return (
    <div className="mx-auto w-full max-w-sm rounded-3xl bg-zinc-900/80 p-4 ring-1 ring-white/10 backdrop-blur sm:max-w-md">
      <div className="flex items-center justify-between px-1 pb-3">
        <p className="text-sm font-semibold text-white">YKS Kampı</p>
        <p className="text-xs text-zinc-400">
          <span className="text-emerald-300">2</span> / 3 çalışıyor
        </p>
      </div>
      <ul className="divide-y divide-white/5 rounded-2xl bg-white/[0.03]">
        {people.map((p) => (
          <li key={p.name} className="flex items-center gap-3 px-3 py-2.5">
            <span className="relative grid size-8 place-items-center rounded-full bg-zinc-800 text-xs font-semibold">
              {p.name[0]}
              <span
                className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-zinc-900 ${
                  p.active ? "bg-emerald-400" : "bg-zinc-600"
                }`}
              />
            </span>
            <span className="flex-1 text-sm text-zinc-200">{p.name}</span>
            {p.time ? (
              <span className="font-mono text-sm text-emerald-300 tabular-nums">{p.time}</span>
            ) : (
              <span className="text-xs text-zinc-500">mola</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
