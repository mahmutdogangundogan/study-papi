"use client";

import { useEffect, useState } from "react";
import type { RoomLiveData } from "@/lib/data";
import { elapsedSeconds, formatClock, formatDuration, syncClock, useNow } from "./clock";
import { useTimer } from "./timer-provider";

const POLL_MS = 5000;

type LiveData = RoomLiveData;

export function RoomLive({ roomId, meId, initial }: { roomId: string; meId: string; initial: LiveData }) {
  const [data, setData] = useState(initial);
  const { state: myTimer, version } = useTimer();
  const now = useNow();

  useEffect(() => {
    let controller: AbortController | undefined;
    async function load() {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(`/api/rooms/${roomId}/live`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return;
        const next: LiveData = await res.json();
        syncClock(next.serverNow);
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
  }, [roomId, version]);

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

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-white">Odadakiler</h2>
        <p className="text-sm text-zinc-400">
          <span className="font-medium text-emerald-300">{studying}</span> / {members.length} kişi çalışıyor
        </p>
      </div>
      <ul className="divide-y divide-white/5 overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
        {members.map((m) => {
          const active = m.activeSince !== null;
          const elapsed = active && now ? elapsedSeconds(m.activeSince!, now) : 0;
          const today = m.todaySeconds + (active && now ? elapsedSeconds(m.asOf, now) : 0);
          return (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.displayName} active={active} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {m.displayName}
                  {m.userId === meId && <span className="text-zinc-500"> (sen)</span>}
                  {m.role === "owner" && (
                    <span className="ml-1.5 rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300 uppercase">
                      sahip
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  @{m.username} · bugün {now ? formatDuration(today) : "—"}
                </p>
              </div>
              {active ? (
                <span className="font-mono text-sm font-semibold text-emerald-300 tabular-nums">
                  {now ? formatClock(elapsed) : "--:--:--"}
                </span>
              ) : (
                <span className="text-xs text-zinc-500">mola</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Avatar({ name, active }: { name: string; active: boolean }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");
  return (
    <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
      {initials}
      <span
        className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-zinc-950 ${
          active ? "bg-emerald-400" : "bg-zinc-600"
        }`}
      />
    </span>
  );
}
