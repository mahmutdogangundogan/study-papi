"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { roomMembers, rooms } from "@/db/schema";
import {
  generateRoomCode,
  getRoomByCode,
  isMember,
  isUuid,
  normalizeRoomCode,
} from "@/lib/data";
import { requireUser } from "@/lib/session";

export type RoomFormState = {
  error?: string;
  fields?: { name?: string; description?: string; visibility?: string; code?: string };
};

const createRoomSchema = z.object({
  name: z.string().trim().min(2, "Oda adı en az 2 karakter olmalı.").max(60, "Oda adı en fazla 60 karakter."),
  description: z.string().trim().max(280, "Açıklama en fazla 280 karakter."),
  visibility: z.enum(["public", "private"]),
});

function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause ?? error;
  return (cause as { code?: string })?.code === "23505";
}

// Kod çakışırsa (çok düşük ihtimal) yeni kodla tekrar dene
async function withFreshCode<T>(fn: (code: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn(generateRoomCode());
    } catch (error) {
      if (attempt >= 4 || !isUniqueViolation(error)) throw error;
    }
  }
}

export async function createRoom(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const user = await requireUser();
  const raw = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    visibility: String(formData.get("visibility") ?? "public"),
  };
  const parsed = createRoomSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: raw };

  const roomId = await withFreshCode((code) =>
    db.transaction(async (tx) => {
      const [room] = await tx
        .insert(rooms)
        .values({ ...parsed.data, code, ownerId: user.id })
        .returning({ id: rooms.id });
      await tx.insert(roomMembers).values({ roomId: room.id, userId: user.id, role: "owner" });
      return room.id;
    }),
  );

  redirect(`/rooms/${roomId}`);
}

// Hem davet linki (/join/KOD) hem de elle girilen kod buraya gelir
export async function joinByCode(_prev: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const user = await requireUser();
  const input = String(formData.get("code") ?? "");
  const code = normalizeRoomCode(input);
  if (!code) return { error: "Bir oda kodu gir.", fields: { code: input } };

  const room = await getRoomByCode(code);
  if (!room) return { error: "Bu koda ait bir oda bulunamadı.", fields: { code: input } };

  await db.insert(roomMembers).values({ roomId: room.id, userId: user.id }).onConflictDoNothing();
  redirect(`/rooms/${room.id}`);
}

export async function joinPublicRoom(roomId: string) {
  const user = await requireUser();
  if (!isUuid(roomId)) return;
  const [room] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.visibility, "public")))
    .limit(1);
  if (!room) return;

  await db.insert(roomMembers).values({ roomId: room.id, userId: user.id }).onConflictDoNothing();
  redirect(`/rooms/${room.id}`);
}

export async function leaveRoom(roomId: string) {
  const user = await requireUser();
  if (!isUuid(roomId)) return;
  // Oda sahibi odadan ayrılamaz, odayı silebilir
  if ((await isMember(roomId, user.id)) !== "member") return;
  await db
    .delete(roomMembers)
    .where(and(eq(roomMembers.roomId, roomId), eq(roomMembers.userId, user.id)));
  redirect("/rooms");
}

export async function deleteRoom(roomId: string) {
  const user = await requireUser();
  if (!isUuid(roomId)) return;
  await db.delete(rooms).where(and(eq(rooms.id, roomId), eq(rooms.ownerId, user.id)));
  redirect("/rooms");
}

// Link sızdıysa eski kod ve link geçersiz olur, mevcut üyeler odada kalır
export async function regenerateRoomCode(roomId: string) {
  const user = await requireUser();
  if (!isUuid(roomId)) return;
  await withFreshCode((code) =>
    db
      .update(rooms)
      .set({ code })
      .where(and(eq(rooms.id, roomId), eq(rooms.ownerId, user.id))),
  );
  refresh();
}
