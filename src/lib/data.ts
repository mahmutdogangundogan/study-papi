import "server-only";
import { randomInt } from "node:crypto";
import { connection } from "next/server";
import { and, desc, eq, ilike, isNull, sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db";
import { roomMembers, rooms, studySessions, users } from "@/db/schema";

// "Bugün" hesabı bu saat dilimine göre yapılır
const TZ = process.env.APP_TIMEZONE ?? "Europe/Istanbul";
const todayStart = sql`(date_trunc('day', now() at time zone ${TZ}) at time zone ${TZ})`;

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
  const [row] = await db
    .select({ startedAt: studySessions.startedAt })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), isNull(studySessions.endedAt)))
    .limit(1);
  const [today] = await db.execute<{ seconds: number }>(
    sql`select ${todaySecondsFor(sql`${userId}::uuid`)} as seconds`,
  );

  return {
    activeSince: row?.startedAt.toISOString() ?? null,
    todaySeconds: today?.seconds ?? 0,
    serverNow: new Date().toISOString(),
  };
}

export type TimerState = Awaited<ReturnType<typeof getTimerState>>;
