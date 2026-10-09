"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomLiveData } from "@/lib/data";
import { elapsedSeconds, formatDuration, syncClock, useNow } from "./clock";
import { Lamp } from "./lamp";
import { Clock } from "./timer-ui";
import { useTimer } from "./timer-provider";

const POLL_MS = 5000;
const TZ = "Europe/Istanbul";
const dayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, dateStyle: "short" });
const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export function RoomLive({ roomId, meId, initial }: { roomId: string; meId: string; initial: RoomLiveData }) {
  const [data, setData] = useState(initial);
  const [announcement, setAnnouncement] = useState("");
  const { state: myTimer, version } = useTimer();
  const now = useNow();
  const previous = useRef(new Map(initial.members.map((m) => [m.userId, m.activeSince !== null])));

  useEffect(() => {
    let controller: AbortController | undefined;
    async function load() {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(`/api/rooms/${roomId}/live`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return;
        const next: RoomLiveData = await res.json();
        syncClock(next.serverNow);

        // Ekran okuyucular için sadece durum değişikliklerini duyur, her saniyeyi değil
        const changes = next.members
          .filter((m) => m.userId !== meId)
          .filter((m) => previous.current.has(m.userId) && previous.current.get(m.userId) !== (m.activeSince !== null))
          .map((m) => `${m.displayName} ${m.activeSince ? "çalışmaya başladı" : "ara verdi"}`);
        if (changes.length) setAnnouncement(changes.join(". "));
        previous.current = new Map(next.members.map((m) => [m.userId, m.activeSince !== null]));

        setData(next);
      } catch {
        // ağ hatası veya iptal: bir sonraki turda tekrar denenir
      }
    }
    // version değiştiğinde (kendi timer'ım başladı/durdu) hemen yenile
    if (version > 0) load();
    const interval = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", load);
      controller?.abort();
    };
  }, [roomId, meId, version]);

  // Kendi satırımı sunucu cevabını beklemeden kendi timer state'imden göster
  const members = data.members.map((m) =>
    m.userId === meId
      ? { ...m, activeSince: myTimer.activeSince, todaySeconds: myTimer.todaySeconds, asOf: myTimer.serverNow }
      : { ...m, asOf: data.serverNow },
  );
  members.sort((a, b) => {
    if (!!a.activeSince !== !!b.activeSince) return a.activeSince ? -1 : 1;
    if (a.activeSince && b.activeSince) return a.activeSince.localeCompare(b.activeSince);
    return b.todaySeconds - a.todaySeconds;
  });
  const studying = members.filter((m) => m.activeSince).length;
  const today = now ? dayFmt.format(now) : null;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <h2 className="font-serif text-[22px] font-bold">Masadakiler</h2>
        <p className="text-[14px] text-ink-muted">
          {studying === 0
            ? "Şu an kimse çalışmıyor"
            : studying === members.length
              ? "Herkes çalışıyor"
              : `${studying} kişi çalışıyor, ${members.length - studying} kişi molada`}
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      <ul className="ledger -mx-4 sm:mx-0">
        {members.map((m) => {
          const active = m.activeSince !== null;
          const elapsed = active && now ? elapsedSeconds(m.activeSince!, now) : 0;
          const todayTotal = m.todaySeconds + (active && now ? elapsedSeconds(m.asOf, now) : 0);
          const lastToday = m.lastEndedAt && today && dayFmt.format(new Date(m.lastEndedAt)) === today;
          return (
            <li key={m.userId} className="ink-in flex min-h-16 items-center">
              <span className="flex w-[52px] shrink-0 justify-center self-stretch pt-3">
                <Lamp on={active} size={24} />
              </span>
              <div className="min-w-0 flex-1 py-3 pl-3.5">
                <p className="flex items-center gap-2 font-semibold">
                  <span className="truncate">
                    <span className="highlight" data-on={active}>
                      {m.displayName}
                    </span>
                    {m.userId === meId && <span className="font-normal text-ink-muted"> (sen)</span>}
                  </span>
                  {m.role === "owner" && <span className="stamp text-ink-muted">Oda sahibi</span>}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-ink-muted">
                  {active ? (
                    <span className="font-medium text-lamp-ink">çalışıyor</span>
                  ) : lastToday ? (
                    `molada, son ${timeFmt.format(new Date(m.lastEndedAt!))}`
                  ) : (
                    "molada"
                  )}
                </p>
              </div>
              <div className="shrink-0 py-3 pr-4 text-right sm:pr-2">
                {active && (
                  <Clock seconds={now ? elapsed : 0} running className="block text-[20px] leading-tight font-medium" />
                )}
                <span className="block text-[13px] text-ink-muted">
                  bugün <span className="numerals">{now ? formatDuration(todayTotal) : "…"}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
