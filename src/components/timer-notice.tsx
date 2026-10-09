"use client";

import { useEffect, useState } from "react";
import { CONFIRM_HOURS, GRACE_MINUTES } from "@/lib/timer-rules";
import { STUDY_TZ } from "@/lib/study-day";
import { useNow } from "./clock";
import { useTimer } from "./timer-provider";

const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: STUDY_TZ, hour: "2-digit", minute: "2-digit" });
const PROMPT_TITLE = "Hâlâ çalışıyor musun?";

// Header'ın altındaki şerit: unutulan timer için onay sorusu ve otomatik durma bildirimi
export function TimerNotice() {
  const { state, confirm, pending } = useTimer();
  const now = useNow();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const promptAt = state.activeSince && state.confirmedUntil ? Date.parse(state.confirmedUntil) : null;
  const prompting = promptAt !== null && now !== null && now >= promptAt;

  // Başka sekmedeyken de fark edilsin
  useEffect(() => {
    if (!prompting) return;
    const original = document.title;
    document.title = `(!) ${PROMPT_TITLE}`;
    return () => {
      document.title = original;
    };
  }, [prompting]);

  if (prompting) {
    const minutesLeft = Math.max(1, Math.ceil((promptAt + GRACE_MINUTES * 60_000 - now) / 60_000));
    return (
      <Strip>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{PROMPT_TITLE}</p>
          <p className="text-[13px] text-ink-muted">
            Timer’ın {CONFIRM_HOURS} saattir kesintisiz çalışıyor. <span className="numerals">{minutesLeft}</span> dk
            içinde onaylamazsan durur ve soru çıktığı andan (<span className="numerals">{timeFmt.format(promptAt)}</span>)
            sonrası sayılmaz.
          </p>
        </div>
        <button type="button" onClick={confirm} disabled={pending} className="btn-primary btn-sm shrink-0">
          Evet, çalışıyorum
        </button>
      </Strip>
    );
  }

  if (!state.activeSince && state.autoStoppedAt && dismissed !== state.autoStoppedAt) {
    return (
      <Strip>
        <p className="min-w-0 flex-1 text-[14px]">
          Onay gelmediği için timer’ın durduruldu.{" "}
          <span className="numerals">{timeFmt.format(Date.parse(state.autoStoppedAt))}</span> sonrası sayılmadı.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(state.autoStoppedAt)}
          className="btn-secondary btn-sm shrink-0"
        >
          Tamam
        </button>
      </Strip>
    );
  }

  return null;
}

function Strip({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="border-t border-lamp-ink/25 bg-lamp/30">
      <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">{children}</div>
    </div>
  );
}
