"use client";

import { createContext, use, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { confirmTimer, startTimer, stopTimer } from "@/actions/timer";
import type { TimerState } from "@/lib/data";
import { onDayReset, syncClock } from "./clock";
import { subscribeLive } from "./live-socket";

type TimerContextValue = {
  state: TimerState;
  pending: boolean;
  toggle: () => void;
  /** "Hâlâ çalışıyor musun?" sorusuna evet */
  confirm: () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ initial, children }: { initial: TimerState; children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();
  // Her tıklamada artar; tıklamadan önce başlamış bir tazeleme isteği yeni durumu ezmesin
  const mutationRef = useRef(0);

  useEffect(() => syncClock(initial.serverNow), [initial.serverNow]);

  // Başka cihazdan başlatılan/durdurulan, onaysız kaldığı için duran timer'ı ve gece 03.00 sıfırlamasını yakala
  useEffect(() => {
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      const mutation = mutationRef.current;
      try {
        const res = await fetch("/api/me/timer", { cache: "no-store" });
        if (!res.ok || mutation !== mutationRef.current) return;
        const next: TimerState = await res.json();
        if (mutation !== mutationRef.current) return;
        syncClock(next.serverNow);
        setState(next);
      } catch {
        // sonraki bildirimde ya da sekmeye dönünce tekrar denenir
      }
    }
    const unsubscribe = subscribeLive((event) => {
      if (event.type === "open" || event.type === "timer") refresh();
    });
    const cancelDayReset = onDayReset(refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      unsubscribe();
      cancelDayReset();
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  function run(action: () => Promise<TimerState>) {
    mutationRef.current++;
    startTransition(async () => {
      const next = await action();
      syncClock(next.serverNow);
      setState(next);
    });
  }

  const toggle = () => run(state.activeSince !== null ? stopTimer : startTimer);
  const confirm = () => run(confirmTimer);

  return <TimerContext value={{ state, pending, toggle, confirm }}>{children}</TimerContext>;
}

export function useTimer() {
  const ctx = use(TimerContext);
  if (!ctx) throw new Error("useTimer, TimerProvider içinde kullanılmalı");
  return ctx;
}
