// Anlık güncellemeler. Postgres, timer ve oda üyeliği değişikliklerini NOTIFY ile bildirir
// (drizzle/0002_realtime_notify.sql); burası LISTEN eder ve ilgili tarayıcılara WebSocket üzerinden
// sadece "şu değişti" der. Tarayıcı veriyi mevcut API'lerden çeker; yetki ve sorgular tek yerde kalır.
//
// Next.js'in derlediği koddan bağımsız, doğrudan Node ile çalışır (bkz. server.mts): "@/..." yok.
import { createHash } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import postgres from "postgres";
import { WebSocketServer, type WebSocket } from "ws";
import { GRACE_MINUTES } from "../lib/timer-rules.ts";

const PATH = "/ws";
const SESSION_COOKIE = "sp_session";
const PING_MS = 30_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ClientMessage = { type: "watch" | "unwatch"; roomId: string };
type ServerMessage = { type: "timer" } | { type: "room" | "chat"; roomId: string };
type Client = { userId: string; rooms: Set<string>; alive: boolean };

export async function attachRealtime(server: Server, databaseUrl: string) {
  const sql = postgres(databaseUrl, { max: 3 });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 });
  const clients = new Map<WebSocket, Client>();

  function send(ws: WebSocket, message: ServerMessage) {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message));
  }

  function notifyRoom(roomId: string, type: "room" | "chat" = "room") {
    for (const [ws, client] of clients) if (client.rooms.has(roomId)) send(ws, { type, roomId });
  }

  // Çerezdeki oturumu src/lib/session.ts ile aynı şekilde doğrula
  async function authenticate(req: IncomingMessage) {
    // Başka bir sitenin, ziyaretçinin çereziyle bağlantı açmasın
    const origin = req.headers.origin;
    const host = req.headers["x-forwarded-host"] ?? req.headers.host;
    if (origin && URL.canParse(origin) && new URL(origin).host !== host) return null;

    const token = req.headers.cookie
      ?.split(";")
      .map((part) => part.trim().split("="))
      .find(([name]) => name === SESSION_COOKIE)?.[1];
    if (!token) return null;

    const [row] = await sql<{ userId: string }[]>`
      select user_id as "userId" from auth_sessions
      where id = ${createHash("sha256").update(token).digest("hex")} and expires_at > now()`;
    return row?.userId ?? null;
  }

  // Private odayı sadece üyeleri izleyebilir (src/app/api/rooms/[id]/live ile aynı kural)
  async function canWatch(roomId: string, userId: string) {
    if (!UUID_RE.test(roomId)) return false;
    const [row] = await sql`
      select 1 from rooms r
      where r.id = ${roomId}
        and (r.visibility = 'public' or exists(select 1 from room_members m where m.room_id = r.id and m.user_id = ${userId}))`;
    return !!row;
  }

  async function onMessage(client: Client, data: string) {
    const message: ClientMessage = JSON.parse(data);
    if (message.type === "watch" && (await canWatch(message.roomId, client.userId))) client.rooms.add(message.roomId);
    if (message.type === "unwatch") client.rooms.delete(message.roomId);
  }

  server.on("upgrade", async (req, socket, head) => {
    // Diğer upgrade istekleri (dev'de HMR) Next.js'e kalır
    if (new URL(req.url ?? "/", "http://localhost").pathname !== PATH) return;
    const userId = await authenticate(req).catch(() => null);
    if (!userId) {
      socket.end("HTTP/1.1 401 Unauthorized\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const client: Client = { userId, rooms: new Set(), alive: true };
      clients.set(ws, client);
      ws.on("pong", () => (client.alive = true));
      ws.on("message", (data) => onMessage(client, String(data)).catch(() => ws.close(1008)));
      ws.on("close", () => clients.delete(ws));
    });
  });

  // Kopmuş bağlantıları temizle; ara katmanlar boşta duran bağlantıyı da kapatmasın
  setInterval(() => {
    for (const [ws, client] of clients) {
      if (!client.alive) {
        ws.terminate();
        continue;
      }
      client.alive = false;
      ws.ping();
    }
  }, PING_MS).unref();

  // Onaysız kalan timer'ları süresi dolduğu an kapat. Okuma sırasında closeExpiredSessions
  // (src/lib/data.ts) de kapatıyor ama artık kimse sormuyor; odadakiler bunu beklemeden görsün.
  const grace = `${GRACE_MINUTES} minutes`;
  let sweepTimer: ReturnType<typeof setTimeout> | undefined;

  async function scheduleSweep() {
    const [row] = await sql<{ ms: number | null }[]>`
      select (extract(epoch from (min(confirmed_until) + ${grace}::interval - now())) * 1000)::float8 as ms
      from study_sessions where ended_at is null`;
    clearTimeout(sweepTimer);
    if (row.ms !== null) sweepTimer = setTimeout(sweep, Math.max(0, row.ms) + 1000);
  }

  async function sweep() {
    try {
      // Kapanan her kayıt tetikleyiciyle timer_changed gönderir
      await sql`
        update study_sessions set ended_at = confirmed_until, auto_stopped = true
        where ended_at is null and confirmed_until + ${grace}::interval <= now()`;
      await scheduleSweep();
    } catch (error) {
      console.error("[realtime] sweep", error);
      sweepTimer = setTimeout(sweep, PING_MS);
    }
  }

  await sql.listen(
    "timer_changed",
    async (userId) => {
      try {
        for (const [ws, client] of clients) if (client.userId === userId) send(ws, { type: "timer" });
        // Timer kişiye ait; kişinin üye olduğu her oda görsün
        const rows = await sql<{ roomId: string }[]>`select room_id as "roomId" from room_members where user_id = ${userId}`;
        for (const { roomId } of rows) notifyRoom(roomId);
        await scheduleSweep();
      } catch (error) {
        console.error("[realtime] timer_changed", error);
      }
    },
    sweep,
  );
  await sql.listen("room_members_changed", (roomId) => notifyRoom(roomId));
  // Yeni sohbet mesajı (drizzle/0003_room_chat.sql); izin canWatch ile aynı: private odayı sadece üyeleri izler
  await sql.listen("room_message", (roomId) => notifyRoom(roomId, "chat"));
}
