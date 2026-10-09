"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { studySessions } from "@/db/schema";
import { closeExpiredSessions, confirmWindow, getTimerState, graceWindow } from "@/lib/data";
import { requireUser } from "@/lib/session";

// Timer kişiye ait: hangi odadan başlatılırsa başlatılsın kişinin tek timer'ı çalışır
export async function startTimer() {
  const user = await requireUser();
  // Süresi dolmuş açık timer yeni timer'ın açılmasını engellemesin
  await closeExpiredSessions();
  // Zaten açık bir timer varsa kısmi unique index sayesinde yeni kayıt açılmaz
  await db
    .insert(studySessions)
    .values({ userId: user.id, confirmedUntil: sql`now() + ${confirmWindow}` })
    .onConflictDoNothing();
  return getTimerState(user.id);
}

export async function stopTimer() {
  const user = await requireUser();
  await db
    .update(studySessions)
    // Onay süresi de geçmişse sorunun çıktığı andan sonrası sayılmaz
    .set({
      endedAt: sql`case when now() >= ${studySessions.confirmedUntil} + ${graceWindow}
        then ${studySessions.confirmedUntil} else now() end`,
    })
    .where(and(eq(studySessions.userId, user.id), isNull(studySessions.endedAt)));
  return getTimerState(user.id);
}

// "Hâlâ çalışıyor musun?" sorusuna evet: bir sonraki soru CONFIRM_HOURS sonra
export async function confirmTimer() {
  const user = await requireUser();
  await db
    .update(studySessions)
    .set({ confirmedUntil: sql`now() + ${confirmWindow}` })
    .where(
      and(
        eq(studySessions.userId, user.id),
        isNull(studySessions.endedAt),
        sql`${studySessions.confirmedUntil} + ${graceWindow} > now()`,
      ),
    );
  return getTimerState(user.id);
}
