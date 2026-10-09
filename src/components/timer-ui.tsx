"use client";

import { elapsedSeconds, formatClock, formatDuration, useNow } from "./clock";
import { useTimer } from "./timer-provider";

function useMyTimer() {
  const { state, pending, toggle } = useTimer();
  const now = useNow();
  const active = state.activeSince !== null;
  const elapsed = active && now ? elapsedSeconds(state.activeSince!, now) : 0;
  // todaySeconds, serverNow anındaki toplamdır; timer çalışıyorsa o andan beri geçeni ekle
  const today = state.todaySeconds + (active && now ? elapsedSeconds(state.serverNow, now) : 0);
  return { active, elapsed, today, ready: now !== null, pending, toggle };
}

export function TimerPill() {
  const { active, elapsed, ready, pending, toggle } = useMyTimer();
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={active ? "Timer'ı durdur" : "Çalışmaya başla"}
      className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium tabular-nums transition disabled:opacity-60 ${
        active
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30"
          : "bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10"
      }`}
    >
      <span
        className={`size-2 rounded-full ${active ? "animate-pulse bg-emerald-400" : "bg-zinc-500"}`}
      />
      {active ? (ready ? formatClock(elapsed) : "--:--:--") : "Başla"}
    </button>
  );
}

export function TimerCard() {
  const { active, elapsed, today, ready, pending, toggle } = useMyTimer();
  return (
    <section
      className={`rounded-3xl p-6 text-center ring-1 transition ${
        active ? "bg-emerald-500/10 ring-emerald-400/30" : "bg-white/[0.03] ring-white/10"
      }`}
    >
      <p className={`text-sm font-medium ${active ? "text-emerald-300" : "text-zinc-400"}`}>
        {active ? "Çalışıyorsun" : "Şu an çalışmıyorsun"}
      </p>
      <p className="mt-2 font-mono text-5xl font-semibold tracking-tight text-white tabular-nums sm:text-6xl">
        {ready ? formatClock(elapsed) : "00:00:00"}
      </p>
      <p className="mt-2 text-sm text-zinc-400">
        Bugün toplam: <span className="text-zinc-200">{ready ? formatDuration(today) : "—"}</span>
      </p>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`mt-6 h-14 w-full rounded-2xl text-base font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
          active
            ? "bg-zinc-800 text-white ring-1 ring-white/10 hover:bg-zinc-700"
            : "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
        }`}
      >
        {pending ? "…" : active ? "Mola ver" : "Çalışmaya başla"}
      </button>
      <p className="mt-3 text-xs text-zinc-500">
        Timer sana ait: üye olduğun tüm odalarda seni çalışıyor olarak görürler.
      </p>
    </section>
  );
}
