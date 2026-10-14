"use server";

import { z } from "zod";
import {
  insertRoomMessage,
  isMember,
  isUuid,
  MESSAGE_MAX_LENGTH,
  recentMessageCount,
  type ChatMessage,
} from "@/lib/data";
import { requireUser } from "@/lib/session";

export type SendMessageResult = { message: ChatMessage } | { error: string };

const bodySchema = z
  .string()
  .trim()
  .min(1, "Boş mesaj gönderilemez.")
  .max(MESSAGE_MAX_LENGTH, `Mesaj en fazla ${MESSAGE_MAX_LENGTH} karakter olabilir.`);

// Odadakiler mesajı tetikleyici + WebSocket bildirimiyle alır (drizzle/0003_room_chat.sql)
export async function sendMessage(roomId: string, body: string): Promise<SendMessageResult> {
  const user = await requireUser();
  if (!isUuid(roomId) || !(await isMember(roomId, user.id))) {
    return { error: "Bu odaya yazmak için önce katılman gerekiyor." };
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if ((await recentMessageCount(roomId, user.id)) >= 5) {
    return { error: "Biraz yavaş. Birkaç saniye sonra tekrar dene." };
  }
  return { message: await insertRoomMessage(roomId, user.id, parsed.data) };
}
