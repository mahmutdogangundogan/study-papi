"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { getTimerState } from "@/lib/data";
import { requireUser } from "@/lib/session";

// Timer kişiye ait: hangi odadan başlatılırsa başlatılsın kişinin tek timer'ı çalışır
export async function startTimer() {
  const user = await requireUser();
  // Zaten açık bir timer varsa kısmi unique index sayesinde yeni kayıt açılmaz
  await db.insert(studySessions).values({ userId: user.id }).onConflictDoNothing();
  return getTimerState(user.id);
}

export async function stopTimer() {
  const user = await requireUser();
  await db
    .update(studySessions)
    .set({ endedAt: sql`now()` })
    .where(and(eq(studySessions.userId, user.id), isNull(studySessions.endedAt)));
  return getTimerState(user.id);
}
