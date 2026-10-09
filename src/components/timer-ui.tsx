"use client";

import { elapsedSeconds, formatDuration, useNow } from "./clock";
import { Lamp } from "./lamp";
import { useTimer } from "./timer-provider";

// Timer bugünkü toplamı gösterir: ara verince durur, devam edince kaldığı yerden sayar,
// gece yarısı sıfırlanır.
function useMyTimer() {
  const { state, pending, toggle } = useTimer();
  const now = useNow();
  const active = state.activeSince !== null;
  // todaySeconds, serverNow anındaki toplamdır; timer çalışıyorsa o andan beri geçeni ekle
  const total = state.todaySeconds + (active && now ? elapsedSeconds(state.serverNow, now) : 0);
  const session = active && now ? elapsedSeconds(state.activeSince!, now) : 0;
  return { active, total, session, ready: now !== null, pending, toggle };
}

function parts(totalSeconds: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    pad(Math.floor(totalSeconds / 3600)),
    pad(Math.floor((totalSeconds % 3600) / 60)),
    pad(totalSeconds % 60),
  ];
}

/** Rakamlar mürekkep, iki nokta soluk; timer çalışırken iki nokta yanıp söner */
export function Clock({ seconds, running, className = "" }: { seconds: number; running: boolean; className?: string }) {
  const [h, m, s] = parts(seconds);
  const colon = <span className={`text-ink-muted ${running ? "ticking-colon" : ""}`}>:</span>;
  return (
    <span className={`numerals ${running ? "text-ink" : "text-ink-muted"} ${className}`}>
      {h}
      {colon}
      {m}
      {colon}
      {s}
    </span>
  );
}

function actionLabel(active: boolean, total: number) {
  if (active) return "Ara ver";
  return total > 0 ? "Devam et" : "Çalışmaya başla";
}

export function TimerChip() {
  const { active, total, ready, pending, toggle } = useMyTimer();
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={actionLabel(active, total)}
      className={`flex h-10 items-center gap-2 rounded-md border px-2.5 transition disabled:opacity-60 ${
        active ? "border-lamp-ink/40 bg-lamp/35" : "border-line bg-sheet"
      }`}
    >
      <Lamp on={active} size={16} />
      {active || total > 0 ? (
        <Clock seconds={ready ? total : 0} running={active} className="text-[17px] font-medium" />
      ) : (
        <span className="text-[15px] font-semibold">Başla</span>
      )}
    </button>
  );
}

export function TimerDesk() {
  const { active, total, session, ready, pending, toggle } = useMyTimer();
  return (
    <section aria-label="Senin timer'ın" className="flex flex-col items-center pt-2 text-center">
      <Lamp on={active} size={44} />
      <p className="mt-4 font-serif text-[15px] text-ink-muted">
        {!ready ? (
          " "
        ) : active ? (
          session < 60 ? (
            "Lamban yanıyor. Yeni başladın."
          ) : (
            <>
              Lamban yanıyor. Bu oturum <span className="numerals text-ink">{formatDuration(session)}</span>
            </>
          )
        ) : total > 0 ? (
          "Ara verdin. Kaldığın yerden devam edebilirsin."
        ) : (
          "Bugün henüz başlamadın."
        )}
      </p>
      <p className="mt-1 text-[clamp(72px,24vw,128px)] leading-none font-light tracking-[-0.02em] [font-variation-settings:'opsz'_72]">
        <Clock seconds={ready ? total : 0} running={active} />
      </p>
      <p className="mt-2 text-[13px] text-ink-muted">Bugün toplam, gece yarısı sıfırlanır</p>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`mt-7 w-full sm:max-w-xs ${active ? "btn-secondary" : "btn-primary"}`}
      >
        {actionLabel(active, total)}
      </button>
      <p className="mt-3 max-w-xs text-[13px] text-ink-muted">
        Timer’ın sana ait. Üye olduğun bütün odalarda aynı anda görünür.
      </p>
    </section>
  );
}
