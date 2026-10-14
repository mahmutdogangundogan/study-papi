import "server-only";
import { randomInt } from "node:crypto";
import { connection } from "next/server";
import { and, desc, eq, ilike, isNull, lt, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db";
import { roomMembers, roomMessages, rooms, studySessions, userNotes, users } from "@/db/schema";
import { DAY_RESET_HOUR, STUDY_TZ } from "@/lib/study-day";
import { CONFIRM_HOURS, GRACE_MINUTES } from "@/lib/timer-rules";

// Çalışma gününün başlangıcı: TSİ ile en son geçilen 03.00
const resetOffset = `${DAY_RESET_HOUR} hours`;
const todayStart = sql`((date_trunc('day', (now() at time zone ${STUDY_TZ}) - ${resetOffset}::interval) + ${resetOffset}::interval) at time zone ${STUDY_TZ})`;
// Bir anın ait olduğu çalışma günü (date)
const studyDate = (ts: SQLWrapper) => sql`((${ts} at time zone ${STUDY_TZ}) - ${resetOffset}::interval)::date`;

export const confirmWindow = sql`${`${CONFIRM_HOURS} hours`}::interval`;
export const graceWindow = sql`${`${GRACE_MINUTES} minutes`}::interval`;

// Soru çıktıktan sonra onay süresi de dolmuş açık timer'ları, sorunun çıktığı anda durmuş olarak kapat.
// Zamanlanmış görev yerine timer durumunu okuyan her sorgudan önce çağrılır; açık
// timer'lar kısmi unique index'te olduğu için ucuzdur.
export async function closeExpiredSessions() {
  await db
    .update(studySessions)
    .set({ endedAt: sql`${studySessions.confirmedUntil}`, autoStopped: true })
    .where(and(isNull(studySessions.endedAt), sql`${studySessions.confirmedUntil} + ${graceWindow} <= now()`));
}

// Karışmasın diye 0/O, 1/I gibi karakterler yok
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;

export function generateRoomCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

// Kullanıcı kodu küçük harf, boşluk, tire ile ya da davet linkinin tamamı olarak yapıştırabilir
export function normalizeRoomCode(input: string) {
  const lastSegment = input.trim().split("/").filter(Boolean).pop() ?? "";
  return lastSegment.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID_RE.test(value);

// Alt sorgularda dış tabloya açıkça "rooms"."id" diye referans ver. Drizzle tek tablolu sorgularda
// kolonu nitelendirmeden ("id") yazıyor; o zaman alt sorgudaki başka bir "id" kolonuna bağlanıyor.
const roomIdRef = sql`${rooms}."id"`;
const memberCount = sql<number>`(select count(*)::int from ${roomMembers} rm where rm.room_id = ${roomIdRef})`;
const studyingCount = sql<number>`(
  select count(*)::int from ${roomMembers} rm
  join ${studySessions} s on s.user_id = rm.user_id and s.ended_at is null
  where rm.room_id = ${roomIdRef}
)`;

export async function getMyRooms(userId: string) {
  await closeExpiredSessions();
  return db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      visibility: rooms.visibility,
      role: roomMembers.role,
      memberCount,
      studyingCount,
    })
    .from(roomMembers)
    .innerJoin(rooms, eq(rooms.id, roomMembers.roomId))
    .where(eq(roomMembers.userId, userId))
    .orderBy(desc(roomMembers.joinedAt));
}

export async function searchPublicRooms(userId: string, query: string) {
  await closeExpiredSessions();
  const q = query.trim();
  return db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      memberCount,
      studyingCount,
      isMember: sql<boolean>`exists(select 1 from ${roomMembers} rm where rm.room_id = ${roomIdRef} and rm.user_id = ${userId})`,
    })
    .from(rooms)
    .where(
      and(
        eq(rooms.visibility, "public"),
        q ? ilike(rooms.name, `%${q.replace(/[\\%_]/g, "\\$&")}%`) : undefined,
      ),
    )
    .orderBy(desc(studyingCount), desc(memberCount), desc(rooms.createdAt))
    .limit(30);
}

export async function getRoomForUser(roomId: string, userId: string) {
  if (!isUuid(roomId)) return null;
  const [row] = await db
    .select({
      id: rooms.id,
      name: rooms.name,
      description: rooms.description,
      visibility: rooms.visibility,
      code: rooms.code,
      memberCount,
      role: roomMembers.role,
    })
    .from(rooms)
    .leftJoin(roomMembers, and(eq(roomMembers.roomId, rooms.id), eq(roomMembers.userId, userId)))
    .where(eq(rooms.id, roomId))
    .limit(1);
  return row ?? null;
}

// Private odayı (üye listesi, sohbet) sadece üyeleri görebilir; varlığı bile belli edilmez
export function canViewRoom<T extends { role: string | null; visibility: string }>(room: T | null): room is T {
  return !!room && (!!room.role || room.visibility === "public");
}

export async function getRoomByCode(code: string) {
  const [row] = await db
    .select({ id: rooms.id, name: rooms.name, description: rooms.description, memberCount })
    .from(rooms)
    .where(eq(rooms.code, normalizeRoomCode(code)))
    .limit(1);
  return row ?? null;
}

export async function isMember(roomId: string, userId: string) {
  const [row] = await db
    .select({ role: roomMembers.role })
    .from(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

// Kullanıcının bugünkü toplam çalışma süresi (çalışan timer dahil, şu ana kadar)
const todaySecondsFor = (userId: SQLWrapper) => sql<number>`(
  select coalesce(sum(extract(epoch from (coalesce(s.ended_at, now()) - greatest(s.started_at, ${todayStart})))), 0)::int
  from ${studySessions} s
  where s.user_id = ${userId} and coalesce(s.ended_at, now()) > ${todayStart}
)`;

export async function getRoomMembersLive(roomId: string) {
  await connection();
  await closeExpiredSessions();
  const rows = await db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      role: roomMembers.role,
      activeSince: studySessions.startedAt,
      lastEndedAt: sql<number | null>`(select (extract(epoch from max(s2.ended_at)) * 1000)::float8 from ${studySessions} s2 where s2.user_id = ${users}."id")`,
      todaySeconds: todaySecondsFor(sql`${users}."id"`),
    })
    .from(roomMembers)
    .innerJoin(users, eq(users.id, roomMembers.userId))
    .leftJoin(studySessions, and(eq(studySessions.userId, users.id), isNull(studySessions.endedAt)))
    .where(eq(roomMembers.roomId, roomId));

  return {
    serverNow: new Date().toISOString(),
    members: rows.map((r) => ({
      ...r,
      activeSince: r.activeSince?.toISOString() ?? null,
      lastEndedAt: r.lastEndedAt ? new Date(r.lastEndedAt).toISOString() : null,
    })),
  };
}

export type RoomLiveData = Awaited<ReturnType<typeof getRoomMembersLive>>;
export type LiveMember = RoomLiveData["members"][number];

export async function getTimerState(userId: string) {
  await connection();
  await closeExpiredSessions();
  const [row] = await db
    .select({ startedAt: studySessions.startedAt, confirmedUntil: studySessions.confirmedUntil })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), isNull(studySessions.endedAt)))
    .limit(1);
  const [today] = await db.execute<{ seconds: number }>(
    sql`select ${todaySecondsFor(sql`${userId}::uuid`)} as seconds`,
  );
  // Son timer'ı bugün onaysız kaldığı için durduysa kullanıcıya söyle
  const [last] = row
    ? []
    : await db
        .select({ endedAt: studySessions.endedAt, autoStopped: studySessions.autoStopped })
        .from(studySessions)
        .where(and(eq(studySessions.userId, userId), sql`${studySessions.endedAt} > ${todayStart}`))
        .orderBy(desc(studySessions.endedAt))
        .limit(1);

  return {
    activeSince: row?.startedAt.toISOString() ?? null,
    confirmedUntil: row?.confirmedUntil.toISOString() ?? null,
    autoStoppedAt: last?.autoStopped ? last.endedAt!.toISOString() : null,
    todaySeconds: today?.seconds ?? 0,
    serverNow: new Date().toISOString(),
  };
}

export type TimerState = Awaited<ReturnType<typeof getTimerState>>;

// ── Sohbet ──────────────────────────────────────────────────────────────────

export const MESSAGE_MAX_LENGTH = 500;
const MESSAGE_PAGE = 50;

const messageColumns = {
  id: roomMessages.id,
  userId: roomMessages.userId,
  username: users.username,
  displayName: users.displayName,
  body: roomMessages.body,
  createdAt: roomMessages.createdAt,
};

type MessageRow = { id: number; userId: string; username: string; displayName: string; body: string; createdAt: Date };
const toChatMessage = (m: MessageRow) => ({ ...m, createdAt: m.createdAt.toISOString() });

/** Odanın son mesajları (eskiden yeniye). before verilirse o mesajdan öncekiler. */
export async function getRoomMessages(roomId: string, before?: number) {
  await connection();
  const rows = await db
    .select(messageColumns)
    .from(roomMessages)
    .innerJoin(users, eq(users.id, roomMessages.userId))
    .where(and(eq(roomMessages.roomId, roomId), before ? lt(roomMessages.id, before) : undefined))
    .orderBy(desc(roomMessages.id))
    .limit(MESSAGE_PAGE + 1);
  return {
    messages: rows.slice(0, MESSAGE_PAGE).reverse().map(toChatMessage),
    hasMore: rows.length > MESSAGE_PAGE,
  };
}

export type ChatPage = Awaited<ReturnType<typeof getRoomMessages>>;
export type ChatMessage = ChatPage["messages"][number];

/** Son 10 saniyede kaç mesaj yazdı (basit flood koruması) */
export async function recentMessageCount(roomId: string, userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(roomMessages)
    .where(
      and(
        eq(roomMessages.roomId, roomId),
        eq(roomMessages.userId, userId),
        sql`${roomMessages.createdAt} > now() - interval '10 seconds'`,
      ),
    );
  return row.count;
}

export async function insertRoomMessage(roomId: string, userId: string, body: string) {
  const [row] = await db.insert(roomMessages).values({ roomId, userId, body }).returning({ id: roomMessages.id });
  const [message] = await db
    .select(messageColumns)
    .from(roomMessages)
    .innerJoin(users, eq(users.id, roomMessages.userId))
    .where(eq(roomMessages.id, row.id));
  return toChatMessage(message);
}

// ── Profil ve istatistikler ─────────────────────────────────────────────────

export async function getProfileUser(username: string) {
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      createdAt: users.createdAt,
      joinedDay: sql<string>`to_char(${studyDate(users.createdAt)}, 'YYYY-MM-DD')`,
    })
    .from(users)
    .where(eq(users.username, username.toLowerCase()))
    .limit(1);
  return row ?? null;
}

/**
 * Kişinin çalıştığı her günün toplamı. Oturumlar 03.00 (TSİ) gün sınırlarından bölünür; gece yarısını
 * geçen çalışma önceki güne sayılır (timer'daki "bugün toplam" ile aynı kural). Açık timer şu ana kadar sayılır.
 */
export async function getStudyHistory(userId: string) {
  await connection();
  await closeExpiredSessions();
  const days = await db.execute<{ day: string; seconds: number }>(sql`
    select to_char(g.day, 'YYYY-MM-DD') as day,
      sum(extract(epoch from least(s.ended, g.day_end) - greatest(s.started_at, g.day_start)))::int as seconds
    from (
      select started_at, coalesce(ended_at, now()) as ended
      from ${studySessions} where user_id = ${userId}
    ) s
    cross join lateral (
      select d::date as day,
        (d + ${resetOffset}::interval) at time zone ${STUDY_TZ} as day_start,
        (d + interval '1 day' + ${resetOffset}::interval) at time zone ${STUDY_TZ} as day_end
      from generate_series(${studyDate(sql`s.started_at`)}::timestamp, ${studyDate(sql`s.ended`)}::timestamp, interval '1 day') d
    ) g
    where least(s.ended, g.day_end) > greatest(s.started_at, g.day_start)
    group by g.day
    order by g.day`);
  const [meta] = await db.execute<{ today: string; longestSession: number; studying: boolean }>(sql`
    select to_char(${studyDate(sql`now()`)}, 'YYYY-MM-DD') as today,
      coalesce(max(extract(epoch from coalesce(ended_at, now()) - started_at)), 0)::int as "longestSession",
      bool_or(ended_at is null) is true as studying
    from ${studySessions} where user_id = ${userId}`);
  return { days: [...days], ...meta };
}

export type StudyHistory = Awaited<ReturnType<typeof getStudyHistory>>;

// ── Kişisel notlar ──────────────────────────────────────────────────────────

export const NOTES_MAX_LENGTH = 20_000;

/** version 0: henüz hiç not yazılmamış */
export async function getNotes(userId: string) {
  const [row] = await db
    .select({ body: userNotes.body, version: userNotes.version, updatedAt: userNotes.updatedAt })
    .from(userNotes)
    .where(eq(userNotes.userId, userId));
  return { body: row?.body ?? "", version: row?.version ?? 0, updatedAt: row?.updatedAt.toISOString() ?? null };
}

export type Notes = Awaited<ReturnType<typeof getNotes>>;

/**
 * Notu yalnızca istemcinin bildiği sürüm hâlâ güncelse yazar. Başka bir sekme/cihaz arada kaydettiyse
 * üstüne yazmaz; güncel hali conflict olarak döner.
 */
export async function saveNotes(userId: string, body: string, baseVersion: number) {
  const returning = { version: userNotes.version, updatedAt: userNotes.updatedAt };
  const [row] =
    baseVersion === 0
      ? await db.insert(userNotes).values({ userId, body }).onConflictDoNothing().returning(returning)
      : await db
          .update(userNotes)
          .set({ body, version: sql`${userNotes.version} + 1`, updatedAt: sql`now()` })
          .where(and(eq(userNotes.userId, userId), eq(userNotes.version, baseVersion)))
          .returning(returning);
  if (!row) return { conflict: true as const, ...(await getNotes(userId)) };
  return { conflict: false as const, body, version: row.version, updatedAt: row.updatedAt.toISOString() };
}
