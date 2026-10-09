"use client";

import { createContext, use, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { confirmTimer, startTimer, stopTimer } from "@/actions/timer";
import type { TimerState } from "@/lib/data";
import { GRACE_MINUTES } from "@/lib/timer-rules";
import { syncClock } from "./clock";

type TimerContextValue = {
  state: TimerState;
  pending: boolean;
  toggle: () => void;
  /** "Hâlâ çalışıyor musun?" sorusuna evet */
  confirm: () => void;
  /** Timer her değiştiğinde artar; canlı listeler bununla hemen yenilenir */
  version: number;
};

const REFRESH_MS = 30_000;

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ initial, children }: { initial: TimerState; children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [version, setVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const activeRef = useRef(initial.activeSince);
  // Her tıklamada artar; tıklamadan önce başlamış bir tazeleme isteği yeni durumu ezmesin
  const mutationRef = useRef(0);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    activeRef.current = state.activeSince;
  }, [state.activeSince]);

  useEffect(() => syncClock(initial.serverNow), [initial.serverNow]);

  // Başka cihazdan başlatılan/durdurulan timer'ı ve gece 03.00 sıfırlamasını yakala
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
        if (next.activeSince !== activeRef.current) setVersion((v) => v + 1);
        setState(next);
      } catch {
        // bir sonraki turda tekrar denenir
      }
    }
    refreshRef.current = refresh;
    const interval = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  // Onay süresi dolduğu an sunucudan yeni durumu al (timer otomatik durmuş olur)
  useEffect(() => {
    if (!state.confirmedUntil) return;
    const deadline = new Date(state.confirmedUntil).getTime() + GRACE_MINUTES * 60_000;
    const ms = deadline - new Date(state.serverNow).getTime() + 1000;
    const timeout = setTimeout(() => refreshRef.current(), Math.max(ms, 1000));
    return () => clearTimeout(timeout);
  }, [state.confirmedUntil, state.serverNow]);

  function run(action: () => Promise<TimerState>) {
    mutationRef.current++;
    startTransition(async () => {
      const next = await action();
      syncClock(next.serverNow);
      setState(next);
      setVersion((v) => v + 1);
    });
  }

  const toggle = () => run(state.activeSince !== null ? stopTimer : startTimer);
  const confirm = () => run(confirmTimer);

  return <TimerContext value={{ state, pending, toggle, confirm, version }}>{children}</TimerContext>;
}

export function useTimer() {
  const ctx = use(TimerContext);
  if (!ctx) throw new Error("useTimer, TimerProvider içinde kullanılmalı");
  return ctx;
}
