"use client";

import { createContext, use, useEffect, useState, useTransition, type ReactNode } from "react";
import { startTimer, stopTimer } from "@/actions/timer";
import type { TimerState } from "@/lib/data";
import { syncClock } from "./clock";

type TimerContextValue = {
  state: TimerState;
  pending: boolean;
  toggle: () => void;
  /** Timer her değiştiğinde artar; canlı listeler bununla hemen yenilenir */
  version: number;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ initial, children }: { initial: TimerState; children: ReactNode }) {
  const [state, setState] = useState(initial);
  const [version, setVersion] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => syncClock(initial.serverNow), [initial.serverNow]);

  function toggle() {
    const wasActive = state.activeSince !== null;
    startTransition(async () => {
      const next = await (wasActive ? stopTimer() : startTimer());
      syncClock(next.serverNow);
      setState(next);
      setVersion((v) => v + 1);
    });
  }

  return <TimerContext value={{ state, pending, toggle, version }}>{children}</TimerContext>;
}

export function useTimer() {
  const ctx = use(TimerContext);
  if (!ctx) throw new Error("useTimer, TimerProvider içinde kullanılmalı");
  return ctx;
}
