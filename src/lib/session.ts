import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { authSessions, users } from "@/db/schema";

export const SESSION_COOKIE = "sp_session";
const SESSION_DAYS = 30;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ id: hashToken(token), userId, expiresAt });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // LAN'da http:// ile açıldığında secure çerez kaydedilmez; sadece https isteklerinde secure yap
    secure: await isHttpsRequest(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function isHttpsRequest() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? h.get("origin")?.split(":")[0];
  return proto === "https";
}

export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export type CurrentUser = { id: string; username: string; displayName: string };

// Aynı istek içinde birden fazla çağrılırsa veritabanına tek sefer gider
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(eq(authSessions.id, hashToken(token)), gt(authSessions.expiresAt, sql`now()`)))
    .limit(1);

  return row ?? null;
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

// Açık yönlendirme (open redirect) olmasın diye sadece site içi yollara izin ver
export function safeNext(next: unknown, fallback = "/rooms"): string {
  if (typeof next !== "string" || !next.startsWith("/") || /^\/[\/\\]/.test(next)) {
    return fallback;
  }
  return next;
}
