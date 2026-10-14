"use client";

import { useEffect, useState } from "react";
import type { Notes } from "@/lib/data";
import { STUDY_TZ } from "@/lib/study-day";
import { useNotesPanel } from "./room-panels";

const MAX_LENGTH = 20_000; // NOTES_MAX_LENGTH (src/lib/data.ts) ile aynı; sunucu da kontrol eder
const SAVE_DELAY_MS = 800;
const RETRY_MS = 4000;

const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: STUDY_TZ, hour: "2-digit", minute: "2-digit" });

type Status = "saved" | "dirty" | "saving" | "error" | "conflict";
type View = { setBody: (body: string) => void; setStatus: (status: Status) => void; setSavedAt: (iso: string | null) => void };

// Kayıt mantığı bileşenden ayrı, sayfa başına bir kez oluşturulur. Yazmayı bırakınca kaydeder; aynı anda tek
// istek gider, sürerken yazılanlar bitince gönderilir. Her kayıt sürüm numarası taşır: başka sekmede/cihazda
// arada kaydedilmiş notun üstüne yazılmaz, o hal yüklenip haber verilir (iki metni birleştirmek satırları
// çoğaltır). Panel açılırken ve sekmeye dönülürken en son hal çekildiği için bu ancak iki yerde aynı anda
// yazılınca olur.
function createSaver(initial: Notes, view: View) {
  let body = initial.body;
  let version = initial.version;
  let dirty = false;
  let saving = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(save, ms);
  };
  const request = (keepalive = false) =>
    fetch("/api/me/notes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, version }),
      keepalive,
    });

  async function save() {
    clearTimeout(timer);
    if (saving || !dirty) return;
    saving = true;
    dirty = false;
    view.setStatus("saving");
    try {
      const res = await request();
      if (res.status !== 200 && res.status !== 409) throw new Error(String(res.status));
      const result: Notes & { conflict: boolean } = await res.json();
      version = result.version;
      view.setSavedAt(result.updatedAt);
      if (result.conflict) {
        body = result.body;
        dirty = false;
        view.setBody(body);
        view.setStatus("conflict");
      } else {
        view.setStatus(dirty ? "dirty" : "saved");
      }
    } catch {
      dirty = true;
      view.setStatus("error");
      schedule(RETRY_MS);
      return;
    } finally {
      saving = false;
    }
    if (dirty) schedule(SAVE_DELAY_MS);
  }

  return {
    save,
    edit(value: string) {
      body = value;
      dirty = true;
      view.setBody(value);
      view.setStatus("dirty");
      schedule(SAVE_DELAY_MS);
    },
    /** Burada kaydedilmemiş bir şey yoksa en son hali çek (başka cihazda yazılanlar görünsün) */
    async refresh() {
      if (document.visibilityState === "hidden" || dirty || saving) return;
      try {
        const res = await fetch("/api/me/notes", { cache: "no-store" });
        if (!res.ok || dirty || saving) return;
        const latest: Notes = await res.json();
        if (latest.version === version) return;
        ({ body, version } = latest);
        view.setBody(body);
        view.setSavedAt(latest.updatedAt);
        view.setStatus("saved");
      } catch {
        // bir dahaki açılışta tekrar denenir
      }
    },
    /** Sayfa kapanırken ya da başka sayfaya geçerken: istek sayfa gitse de tamamlanır */
    flush() {
      clearTimeout(timer);
      if (dirty && !saving) request(true);
      dirty = false;
    },
  };
}

// Kişiye özel not defteri; timer gibi kişiye ait, her odada aynı.
export function PersonalNotes({ initial }: { initial: Notes }) {
  const { open, close } = useNotesPanel();
  const [body, setBody] = useState(initial.body);
  const [status, setStatus] = useState<Status>("saved");
  const [savedAt, setSavedAt] = useState<string | null>(initial.updatedAt);
  const [saver] = useState(() => createSaver(initial, { setBody, setStatus, setSavedAt }));

  useEffect(() => {
    // Açılınca en son hali çek; kapanınca bekleyen kaydı beklemeden gönder
    if (open) saver.refresh();
    else saver.save();
    document.addEventListener("visibilitychange", saver.refresh);
    return () => document.removeEventListener("visibilitychange", saver.refresh);
  }, [open, saver]);

  useEffect(() => {
    window.addEventListener("pagehide", saver.flush);
    return () => {
      window.removeEventListener("pagehide", saver.flush);
      saver.flush(); // oda sayfasından site içinde başka sayfaya geçiş
    };
  }, [saver]);

  const statusText = {
    saved: savedAt ? `Kaydedildi · ${timeFmt.format(new Date(savedAt))}` : "Henüz bir şey yazmadın",
    dirty: "Yazılıyor…",
    saving: "Kaydediliyor…",
    error: "Kaydedilemedi, tekrar deneniyor…",
    conflict: "Not başka bir sekmede ya da cihazda değişmiş; en son hali yüklendi.",
  }[status];

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 pt-3 pb-2.5">
        <div>
          <h2 className="font-serif text-[20px] leading-tight font-bold">Notların</h2>
          <p className="text-[13px] text-ink-muted">Sadece sen görürsün. Her odada aynı defter.</p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Notları kapat"
          className="-mr-2 grid size-9 shrink-0 place-items-center rounded-md text-ink-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <label className="flex min-h-0 flex-1 flex-col px-4 pt-1">
        <span className="sr-only">Notların</span>
        <textarea
          value={body}
          onChange={(e) => saver.edit(e.target.value)}
          onBlur={saver.save}
          maxLength={MAX_LENGTH}
          placeholder={"Bugün ne çalışacaksın?\n\n— Matematik: türev, 40 soru\n— Fizik: elektrik tekrarı"}
          className="field min-h-0! flex-1 resize-none border-b-0! bg-none! pt-3 text-[16px] leading-relaxed"
        />
      </label>

      <p
        role="status"
        className={`flex justify-between gap-3 border-t border-line px-4 py-2.5 text-[12px] ${
          status === "error" || status === "conflict" ? "text-danger" : "text-ink-muted"
        }`}
      >
        <span>{statusText}</span>
        {body.length > MAX_LENGTH - 1000 && (
          <span className="numerals shrink-0">{MAX_LENGTH - body.length} karakter kaldı</span>
        )}
      </p>
    </>
  );
}
