"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { sendMessage } from "@/actions/chat";
import type { ChatMessage, ChatPage } from "@/lib/data";
import { STUDY_TZ } from "@/lib/study-day";
import { useNow } from "./clock";
import { subscribeLive, watchRoom } from "./live-socket";
import { useChatPanel } from "./room-panels";
import { FormError } from "./ui/form";

const MAX_LENGTH = 500; // MESSAGE_MAX_LENGTH (src/lib/data.ts) ile aynı; sunucu da kontrol eder
// Aynı kişinin bu kadar dakika içindeki ardışık mesajları tek başlık altında toplanır
const GROUP_MINUTES = 5;

const timeFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: STUDY_TZ, hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: STUDY_TZ, day: "numeric", month: "long", year: "numeric" });

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function dayLabel(iso: string, now: number | null) {
  const label = dayFmt.format(new Date(iso));
  if (now === null) return label;
  if (label === dayFmt.format(now)) return "Bugün";
  if (label === dayFmt.format(now - 24 * 60 * 60 * 1000)) return "Dün";
  return label;
}

export function RoomChat({ roomId, meId, canWrite, initial }: { roomId: string; meId: string; canWrite: boolean; initial: ChatPage }) {
  const [messages, setMessages] = useState(initial.messages);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [sending, startSending] = useTransition();
  const now = useNow();
  const { open, close, addUnread } = useChatPanel();

  const listRef = useRef<HTMLDivElement>(null);
  // Kullanıcı en alttaysa yeni mesajda aşağı in; yukarıda eski mesaj okuyorsa yerinden oynatma
  const atBottom = useRef(true);
  const scrollTo = useRef<"bottom" | { keepFrom: number } | null>("bottom");
  const lastId = useRef(initial.messages.at(-1)?.id ?? 0);

  useEffect(() => {
    let controller: AbortController | undefined;
    async function loadLatest() {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch(`/api/rooms/${roomId}/messages`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) return;
        const page: ChatPage = await res.json();
        // Uzun süre kopuk kalındıysa son sayfa elimizdekilerle örtüşmeyebilir ve arada okunmamış mesaj
        // kalabilir: o zaman son sayfadan baştan başla, öncesi "Önceki mesajlar" ile gelir
        const gap = page.hasMore && lastId.current > 0 && page.messages[0].id > lastId.current;
        if (gap) {
          setMessages(page.messages);
          setHasMore(true);
        } else {
          setMessages((current) => merge(current, page.messages));
        }
      } catch {
        // ağ hatası veya iptal: sonraki bildirimde ya da sekmeye dönünce tekrar denenir
      }
    }
    const unwatch = watchRoom(roomId);
    const unsubscribe = subscribeLive((event) => {
      if (event.type === "open" || (event.type === "chat" && event.roomId === roomId)) loadLatest();
    });
    document.addEventListener("visibilitychange", loadLatest);
    return () => {
      unwatch();
      unsubscribe();
      document.removeEventListener("visibilitychange", loadLatest);
      controller?.abort();
    };
  }, [roomId]);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const newest = messages.at(-1)?.id ?? 0;
    const arrived = messages.filter((m) => m.id > lastId.current);
    lastId.current = Math.max(lastId.current, newest);
    // Panel kapalıyken başkalarının yazdıkları tutamaçtaki sayaca eklenir
    const fromOthers = arrived.filter((m) => m.userId !== meId).length;
    if (!open && fromOthers > 0) addUnread(fromOthers);

    const target = scrollTo.current;
    scrollTo.current = null;
    if (target && typeof target === "object") {
      // Önceki mesajlar üste eklendi: okunan yer kaymasın
      list.scrollTop = list.scrollHeight - target.keepFrom;
    } else if (target === "bottom" || atBottom.current || arrived.some((m) => m.userId === meId)) {
      list.scrollTop = list.scrollHeight;
    } else if (arrived.length > 0) {
      setUnseen((n) => n + arrived.length);
    }
  }, [messages, meId, open, addUnread]);

  function onScroll() {
    const list = listRef.current!;
    atBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
    if (atBottom.current) setUnseen(0);
  }

  async function loadOlder() {
    const oldest = messages[0]?.id;
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages?before=${oldest}`, { cache: "no-store" });
      if (!res.ok) return;
      const page: ChatPage = await res.json();
      scrollTo.current = { keepFrom: listRef.current!.scrollHeight - listRef.current!.scrollTop };
      setMessages((current) => merge(current, page.messages));
      setHasMore(page.hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }

  function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    setError(undefined);
    startSending(async () => {
      const result = await sendMessage(roomId, body);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDraft("");
      scrollTo.current = "bottom";
      setMessages((current) => merge(current, [result.message]));
    });
  }

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 pt-3 pb-2.5">
        <div>
          <h2 className="font-serif text-[20px] leading-tight font-bold">Sohbet</h2>
          <p className="text-[13px] text-ink-muted">Yazılanlar odada kalır, sonradan gelenler de görür.</p>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Sohbeti kapat"
          className="-mr-2 grid size-9 shrink-0 place-items-center rounded-md text-ink-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={listRef}
          onScroll={onScroll}
          role="log"
          aria-label="Sohbet mesajları"
          className="h-full overflow-y-auto overscroll-contain px-4 py-3"
        >
          {hasMore && (
            <div className="pb-3 text-center">
              <button
                type="button"
                onClick={loadOlder}
                disabled={loadingOlder}
                className="text-[14px] font-medium text-accent underline underline-offset-4 disabled:opacity-60"
              >
                {loadingOlder ? "Yükleniyor…" : "Önceki mesajlar"}
              </button>
            </div>
          )}
          {messages.length === 0 ? (
            <p className="grid h-full place-items-center text-center font-serif text-[16px] text-ink-muted italic">
              Henüz kimse yazmadı. İlk notu sen bırak.
            </p>
          ) : (
            <ol className="space-y-0.5">
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const newDay = !prev || dayFmt.format(new Date(prev.createdAt)) !== dayFmt.format(new Date(m.createdAt));
                const grouped =
                  !newDay &&
                  prev.userId === m.userId &&
                  new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MINUTES * 60 * 1000;
                return (
                  <li key={m.id}>
                    {newDay && (
                      <p className="my-3 flex items-center gap-3 text-[12px] font-medium text-ink-muted">
                        <span className="h-px flex-1 bg-rule" />
                        {dayLabel(m.createdAt, now)}
                        <span className="h-px flex-1 bg-rule" />
                      </p>
                    )}
                    {!grouped && (
                      <p className="mt-2.5 flex items-baseline gap-2">
                        <Link href={`/profile/${m.username}`} className="text-[14px] font-semibold hover:underline">
                          {m.displayName}
                        </Link>
                        {m.userId === meId && <span className="text-[13px] text-ink-muted">(sen)</span>}
                        <time dateTime={m.createdAt} className="numerals text-[12px] text-ink-muted">
                          {timeFmt.format(new Date(m.createdAt))}
                        </time>
                      </p>
                    )}
                    <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">{m.body}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {unseen > 0 && (
          <button
            type="button"
            onClick={() => {
              listRef.current!.scrollTop = listRef.current!.scrollHeight;
              setUnseen(0);
            }}
            className="stamp stamp-in absolute bottom-3 left-1/2 -translate-x-1/2 bg-sheet text-accent"
          >
            {unseen} yeni mesaj ↓
          </button>
        )}
      </div>

      {canWrite ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-2 border-t border-line px-4 pt-2 pb-3"
        >
          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="sr-only">Mesajın</span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter gönderir, Shift+Enter alt satıra geçer; Türkçe/Japonca klavye kompozisyonunu bölme
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                maxLength={MAX_LENGTH}
                placeholder="Bir şey yaz…"
                className="field min-h-12! resize-none bg-none! py-3"
              />
            </label>
            <button type="submit" disabled={sending || !draft.trim()} className="btn-primary btn-sm mb-1 shrink-0">
              Gönder
            </button>
          </div>
          {draft.length > MAX_LENGTH - 50 && (
            <p className="text-right text-[12px] text-ink-muted">
              <span className="numerals">{MAX_LENGTH - draft.length}</span> karakter kaldı
            </p>
          )}
          <FormError message={error} />
        </form>
      ) : (
        <p className="border-t border-line px-4 py-3 text-[14px] text-ink-muted">Yazmak için odaya katıl.</p>
      )}
    </>
  );
}
