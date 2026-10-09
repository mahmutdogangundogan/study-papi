import Link from "next/link";
import { Suspense } from "react";
import { LandingDemo } from "@/components/landing-demo";
import { Logo } from "@/components/ui/logo";
import { getCurrentUser } from "@/lib/session";

const steps = [
  {
    title: "Bir oda aç",
    body: "Herkese açık olursa Keşfet’te listelenir. Özel olursa sadece davet edilenler girer.",
  },
  {
    title: "Arkadaşlarını çağır",
    body: "Her odanın 8 haneli bir kodu ve bir davet linki var. Hangisini gönderirsen.",
  },
  {
    title: "Lambanı yak",
    body: "“Çalışmaya başla”ya bastığında timer’ın sayar. Üç odadaysan üçünde de çalışırken görünürsün; timer tek, sana ait.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Suspense fallback={null}>
          <HeaderAuthLink />
        </Suspense>
      </header>

      <main className="flex-1">
        <section className="graph-paper border-y border-line">
          <div className="mx-auto grid max-w-5xl gap-12 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
            <div>
              <h1 className="font-serif text-[44px] leading-[1.02] font-bold tracking-[-0.02em] sm:text-[64px]">
                Herkes kendi masasında.
                <span className="mt-1 block font-light italic text-accent">Ama aynı salonda.</span>
              </h1>
              <p className="mt-6 max-w-md text-[17px] text-ink-muted">
                Study Papi, arkadaşlarınla birlikte çalışmak için bir okuma salonu. Çalışmaya başladığında lamban
                yanar; kimin çalıştığını, ne zamandır çalıştığını herkes görür.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Suspense
                  fallback={
                    <Link href="/register" className="btn-primary">
                      Hesap aç
                    </Link>
                  }
                >
                  <HeroCta />
                </Suspense>
              </div>
            </div>
            <LandingDemo />
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="font-serif text-[26px] font-bold">Nasıl işliyor?</h2>
          <ol className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="border-t-[1.5px] border-ink pt-4">
                <span className="numerals text-[15px] text-ink-muted">{i + 1}.</span>
                <h3 className="mt-1 text-[18px] font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line py-6 text-center font-serif text-[14px] text-ink-muted italic">
        Sessizce, birlikte.
      </footer>
    </div>
  );
}

async function HeaderAuthLink() {
  const user = await getCurrentUser();
  return (
    <Link href={user ? "/rooms" : "/login"} className="text-[15px] font-semibold text-accent underline underline-offset-4">
      {user ? "Odalarım" : "Giriş yap"}
    </Link>
  );
}

async function HeroCta() {
  const user = await getCurrentUser();
  if (user) {
    return (
      <Link href="/rooms" className="btn-primary">
        Odalarıma git
      </Link>
    );
  }
  return (
    <>
      <Link href="/register" className="btn-primary">
        Hesap aç
      </Link>
      <Link href="/login" className="btn-secondary">
        Giriş yap
      </Link>
    </>
  );
}
