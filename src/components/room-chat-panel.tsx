"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

// Sohbet sağdan kayan bir panel. Kapalıyken de sayfada kalır (WebSocket aboneliği ve geçmiş kaybolmasın,
// okunmamışlar sayılabilsin); açılınca oda içeriği aynı animasyonla sola kayar (bkz. .chat-shift, globals.css).
type ChatPanel = { open: boolean; close: () => void; addUnread: (count: number) => void };

const ChatPanelContext = createContext<ChatPanel | null>(null);

export function useChatPanel() {
  const ctx = use(ChatPanelContext);
  if (!ctx) throw new Error("useChatPanel, RoomChatPanel içinde kullanılmalı");
  return ctx;
}

export function RoomChatPanel({ chat, children }: { chat: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const close = useCallback(() => setOpen(false), []);
  const addUnread = useCallback((count: number) => setUnread((n) => n + count), []);

  function toggle() {
    setOpen((o) => !o);
    setUnread(0);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <ChatPanelContext value={{ open, close, addUnread }}>
      <div className={`chat-slide ${open ? "chat-shift" : ""}`}>{children}</div>

      {/* Tutamaç: panelin sol kenarına yapışık, kapalıyken ekranın sağ kenarında durur. Mobilde büyük timer'ın
          üstüne binmesin diye alt menünün hemen üstünde, masaüstünde dikey ortada */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="room-chat"
        aria-label={open ? "Sohbeti kapat" : unread > 0 ? `Sohbeti aç, ${unread} yeni mesaj` : "Sohbeti aç"}
        className={`chat-slide fixed right-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex h-16 w-9 flex-col items-center justify-center gap-1 md:top-1/2 md:bottom-auto md:h-24 md:w-11 md:-translate-y-1/2 md:gap-1.5 rounded-l-md border border-r-0 border-line bg-sheet text-ink-muted shadow-[-2px_1px_0_rgb(27_35_64/0.06)] hover:text-ink ${
          open ? "chat-handle-open" : ""
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 5.5h16v10H9l-5 4z" />
        </svg>
        <span aria-hidden className={`text-[15px] leading-none transition-transform duration-700 ${open ? "" : "rotate-180"}`}>
          ›
        </span>
        {!open && unread > 0 && (
          <span
            key={badge}
            aria-hidden
            className="stamp-pop numerals absolute -top-2.5 -left-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-[13px] font-semibold text-white shadow-[0_2px_0_var(--color-accent-deep)]"
          >
            {badge}
          </span>
        )}
      </button>

      <aside
        id="room-chat"
        aria-label="Sohbet"
        inert={!open}
        className={`chat-slide chat-panel fixed right-0 z-10 flex flex-col border-l border-line bg-sheet shadow-[-6px_0_24px_rgb(27_35_64/0.08)] ${
          open ? "" : "translate-x-full"
        }`}
      >
        {chat}
      </aside>
    </ChatPanelContext>
  );
}
