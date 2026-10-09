"use client";

import { useNow } from "./clock";
import { Lamp } from "./lamp";
import { Clock } from "./timer-ui";

const rows = [
  { name: "Ayşe", seconds: 6130, today: "3 sa 12 dk" },
  { name: "Mert", seconds: 2275, today: "1 sa 05 dk" },
  { name: "Zeynep", seconds: null, today: "2 sa 40 dk", note: "molada, son 14:20" },
];

// Landing'deki örnek defter: timer'lar sayfa açıkken gerçekten işler
export function LandingDemo() {
  const now = useNow();
  // Saate bağlı küçük bir kaydırma: saniyeler işlesin diye yeterli
  const tick = now ? Math.floor(now / 1000) % 3600 : 0;

  return (
    <figure className="sheet relative -rotate-[0.6deg] pt-4 pb-1">
      <figcaption className="flex items-baseline justify-between px-4 pb-3">
        <span className="font-serif text-[19px] font-bold">YKS Kampı</span>
        <span className="stamp text-accent">Herkese açık</span>
      </figcaption>
      <ul className="ledger">
        {rows.map((r) => {
          const on = r.seconds !== null;
          return (
            <li key={r.name} className="flex min-h-16 items-center">
              <span className="flex w-[52px] shrink-0 justify-center self-stretch pt-3">
                <Lamp on={on} size={24} />
              </span>
              <div className="min-w-0 flex-1 py-3 pl-3.5">
                <p className="font-semibold">
                  <span className="highlight" data-on={on}>
                    {r.name}
                  </span>
                </p>
                <p className="text-[13px] text-ink-muted">
                  {on ? <span className="font-medium text-lamp-ink">çalışıyor</span> : r.note}
                </p>
              </div>
              <div className="shrink-0 py-3 pr-4 text-right">
                {on && <Clock seconds={r.seconds! + tick} running className="block text-[20px] leading-tight font-medium" />}
                <span className="block text-[13px] text-ink-muted">
                  bugün <span className="numerals">{r.today}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
