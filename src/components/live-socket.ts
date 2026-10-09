"use client";

// Sekme başına tek WebSocket (/ws, bkz. src/realtime/server.mts). Sunucu sadece "şu değişti" der,
// veriyi dinleyen bileşen kendisi çeker. Bağlantı koparsa artan aralıklarla yeniden bağlanır;
// her bağlanışta "open" yayınlanır ki kopukken kaçırılan değişiklikler de çekilsin.
export type LiveEvent = { type: "open" } | { type: "timer" } | { type: "room"; roomId: string };

const listeners = new Set<(event: LiveEvent) => void>();
// İzlenen oda → kaç bileşen izliyor
const rooms = new Map<string, number>();
let socket: WebSocket | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let attempts = 0;

function emit(event: LiveEvent) {
  listeners.forEach((l) => l(event));
}

function send(message: { type: "watch" | "unwatch"; roomId: string }) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function connect() {
  clearTimeout(retryTimer);
  if (socket || listeners.size === 0) return;
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  socket = ws;
  ws.onopen = () => {
    attempts = 0;
    rooms.forEach((_, roomId) => send({ type: "watch", roomId }));
    emit({ type: "open" });
  };
  ws.onmessage = (e) => {
    try {
      emit(JSON.parse(e.data));
    } catch {
      // bozuk mesaj: yok say
    }
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = null;
    // 1, 2, 4 … en fazla 30 sn
    if (listeners.size > 0) retryTimer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** attempts++));
  };
}

// Telefon arka plandayken bağlantı kopabilir; öne gelince beklemeden bağlan
function onVisible() {
  if (document.visibilityState === "visible" && !socket) {
    attempts = 0;
    connect();
  }
}

export function subscribeLive(listener: (event: LiveEvent) => void) {
  listeners.add(listener);
  if (listeners.size === 1) document.addEventListener("visibilitychange", onVisible);
  connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    document.removeEventListener("visibilitychange", onVisible);
    clearTimeout(retryTimer);
    const ws = socket;
    socket = null;
    ws?.close();
  };
}

/** Odanın değişikliklerini almaya başla; dönen fonksiyon bırakır */
export function watchRoom(roomId: string) {
  const count = rooms.get(roomId) ?? 0;
  rooms.set(roomId, count + 1);
  if (count === 0) send({ type: "watch", roomId });
  return () => {
    const left = (rooms.get(roomId) ?? 1) - 1;
    if (left > 0) return void rooms.set(roomId, left);
    rooms.delete(roomId);
    send({ type: "unwatch", roomId });
  };
}
