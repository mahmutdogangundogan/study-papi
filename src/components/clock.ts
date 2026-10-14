"use client";

import { useSyncExternalStore } from "react";
import { msUntilDayReset } from "@/lib/study-day";

// Telefonun saati sunucudan farklı olabilir; tüm süreler sunucu saatine göre hesaplanır
let clockOffsetMs = 0;
export function syncClock(serverNowIso: string) {
  clockOffsetMs = new Date(serverNowIso).getTime() - Date.now();
}

const listeners = new Set<() => void>();
let interval: ReturnType<typeof setInterval> | undefined;
let now = 0;

function tick() {
  now = Date.now() + clockOffsetMs;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!interval) {
    tick();
    interval = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(interval);
      interval = undefined;
    }
  };
}

/** Saniyede bir güncellenen sunucu saati. Sunucuda render ederken null döner. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => now || null,
    () => null,
  );
}

/** Her gece 03.00 sıfırlamasında (sunucu saatine göre) çağırır; dönen fonksiyon iptal eder */
export function onDayReset(callback: () => void) {
  let timeout: ReturnType<typeof setTimeout>;
  const schedule = () => {
    timeout = setTimeout(() => {
      callback();
      schedule();
    }, msUntilDayReset(Date.now() + clockOffsetMs) + 1000);
  };
  schedule();
  return () => clearTimeout(timeout);
}

export function elapsedSeconds(sinceIso: string, nowMs: number) {
  return Math.max(0, Math.floor((nowMs - new Date(sinceIso).getTime()) / 1000));
}

export function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export { formatDuration } from "@/lib/duration";
