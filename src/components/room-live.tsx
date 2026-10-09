"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomLiveData } from "@/lib/data";
import { STUDY_TZ, studyDayKey } from "@/lib/study-day";
import { elapsedSeconds, formatDuration, onDayReset, syncClock, useNow } from "./clock";
import { Lamp } from "./lamp";
import { subscribeLive, watchRoom } from "./live-socket";
import { Clock } from "./timer-ui";
import { useTimer } from "./timer-provider";

const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: STUDY_TZ, hour: "2-digit", minute: "2-digit" });

export function RoomLive({ roomId, meId, initial }: { roomId: string; meId: string; initial: RoomLiveData }) {
  const [data, setData] = useState(initial);
  const [announcement, setAnnouncement] = useState("");
  const { state: myTimer } = useTimer();
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
        // ağ hatası veya iptal: sonraki bildirimde ya da sekmeye dönünce tekrar denenir
      }
    }
    // Odadan biri timer'ını başlatınca/durdurunca ya da biri katılıp ayrılınca sunucu haber verir
    const unwatch = watchRoom(roomId);
    const unsubscribe = subscribeLive((event) => {
      if (event.type === "open" || (event.type === "room" && event.roomId === roomId)) load();
    });
    const cancelDayReset = onDayReset(load);
    document.addEventListener("visibilitychange", load);
    return () => {
      unwatch();
      unsubscribe();
      cancelDayReset();
      document.removeEventListener("visibilitychange", load);
      controller?.abort();
    };
  }, [roomId, meId]);

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
  const today = now ? studyDayKey(now) : null;

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
          const lastToday = m.lastEndedAt && today && studyDayKey(new Date(m.lastEndedAt).getTime()) === today;
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
                <Clock
                  seconds={now ? todayTotal : 0}
                  running={active}
                  className="block text-[20px] leading-tight font-medium"
                />
                <span className="block text-[13px] text-ink-muted">
                  {active ? (
                    now && elapsed < 60 ? (
                      "yeni başladı"
                    ) : (
                      <>
                        bu oturum <span className="numerals">{now ? formatDuration(elapsed) : "…"}</span>
                      </>
                    )
                  ) : (
                    "bugün toplam"
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
