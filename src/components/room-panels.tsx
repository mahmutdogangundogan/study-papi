"use client";

import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";

// Oda sayfasının yan panelleri: solda kişisel notlar, sağda sohbet. Aynı anda tek panel açık olur.
// Paneller kapalıyken de sayfada kalır (sohbetin WebSocket aboneliği ve geçmişi kaybolmasın, okunmamışlar
// sayılabilsin, yarım kalan not kaydedilebilsin); açılınca oda içeriği öbür yana kayar (globals.css).
type Side = "left" | "right";
type Panels = { side: Side | null; close: () => void; addUnread: (count: number) => void };

const PanelsContext = createContext<Panels | null>(null);

function usePanels() {
  const ctx = use(PanelsContext);
  if (!ctx) throw new Error("Panel bileşenleri RoomPanels içinde kullanılmalı");
  return ctx;
}

export function useChatPanel() {
  const { side, close, addUnread } = usePanels();
  return { open: side === "right", close, addUnread };
}

export function useNotesPanel() {
  const { side, close } = usePanels();
  return { open: side === "left", close };
}

export function RoomPanels({ notes, chat, children }: { notes: ReactNode; chat: ReactNode; children: ReactNode }) {
  const [side, setSide] = useState<Side | null>(null);
  const [unread, setUnread] = useState(0);

  const close = useCallback(() => setSide(null), []);
  const addUnread = useCallback((count: number) => setUnread((n) => n + count), []);

  function toggle(target: Side) {
    setSide((current) => (current === target ? null : target));
    if (target === "right") setUnread(0);
  }

  useEffect(() => {
    if (!side) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSide(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [side]);

  const shift = side === "right" ? "panel-shift-left" : side === "left" ? "panel-shift-right" : "";

  return (
    <PanelsContext value={{ side, close, addUnread }}>
      <div className={`panel-slide ${shift}`}>{children}</div>

      <Handle
        side="left"
        open={side === "left"}
        onClick={() => toggle("left")}
        label={side === "left" ? "Notları kapat" : "Notlarını aç"}
        // not defteri
        icon="M6 3.5h9l3 3v14H6zM9 9.5h6M9 13h6M9 16.5h4"
      />
      <Handle
        side="right"
        open={side === "right"}
        onClick={() => toggle("right")}
        label={side === "right" ? "Sohbeti kapat" : unread > 0 ? `Sohbeti aç, ${unread} yeni mesaj` : "Sohbeti aç"}
        // konuşma balonu
        icon="M4 5.5h16v10H9l-5 4z"
        badge={side !== "right" && unread > 0 ? (unread > 9 ? "9+" : String(unread)) : null}
      />

      <aside
        id="room-notes"
        aria-label="Notların"
        inert={side !== "left"}
        className={`panel-slide side-panel fixed left-0 z-10 flex flex-col border-r border-line bg-sheet shadow-[6px_0_24px_rgb(27_35_64/0.08)] ${
          side === "left" ? "" : "-translate-x-full"
        }`}
      >
        {notes}
      </aside>
      <aside
        id="room-chat"
        aria-label="Sohbet"
        inert={side !== "right"}
        className={`panel-slide side-panel fixed right-0 z-10 flex flex-col border-l border-line bg-sheet shadow-[-6px_0_24px_rgb(27_35_64/0.08)] ${
          side === "right" ? "" : "translate-x-full"
        }`}
      >
        {chat}
      </aside>
    </PanelsContext>
  );
}

// Panelin iç kenarına yapışık sekme; kapalıyken ekranın kenarında durur. Mobilde büyük timer'ın üstüne
// binmesin diye alt menünün hemen üstünde, masaüstünde dikey ortada
function Handle({
  side,
  open,
  onClick,
  label,
  icon,
  badge = null,
}: {
  side: Side;
  open: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  badge?: string | null;
}) {
  const edge =
    side === "right"
      ? `right-0 rounded-l-md border-r-0 shadow-[-2px_1px_0_rgb(27_35_64/0.06)] ${open ? "panel-handle-open-right" : ""}`
      : `left-0 rounded-r-md border-l-0 shadow-[2px_1px_0_rgb(27_35_64/0.06)] ${open ? "panel-handle-open-left" : ""}`;
  // Ok, panelin açılacağı/kapanacağı yönü gösterir
  const pointsLeft = side === "right" ? !open : open;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={side === "right" ? "room-chat" : "room-notes"}
      aria-label={label}
      className={`panel-slide fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex h-16 w-9 flex-col items-center justify-center gap-1 border border-line bg-sheet text-ink-muted hover:text-ink md:top-1/2 md:bottom-auto md:h-24 md:w-11 md:-translate-y-1/2 md:gap-1.5 ${edge}`}
    >
      <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={icon} />
      </svg>
      <span aria-hidden className={`text-[15px] leading-none transition-transform duration-700 ${pointsLeft ? "rotate-180" : ""}`}>
        ›
      </span>
      {badge && (
        <span
          key={badge}
          aria-hidden
          className={`stamp-pop numerals absolute -top-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-[13px] font-semibold text-white shadow-[0_2px_0_var(--color-accent-deep)] ${
            side === "right" ? "-left-2.5" : "-right-2.5"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
