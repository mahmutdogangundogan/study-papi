"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession, safeNext } from "@/lib/session";

export type AuthFormState = { error?: string; fields?: { username?: string; displayName?: string } };

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,24}$/, "Kullanıcı adı 3-24 karakter olmalı; harf, rakam, _ ve . kullanabilirsin.");

const registerSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1, "Görünen ad boş olamaz.").max(40, "Görünen ad en fazla 40 karakter."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı.").max(200),
});

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const fields = { username: raw.username, displayName: raw.displayName };

  const parsed = registerSchema.safeParse({ ...raw, displayName: raw.displayName || raw.username });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const [user] = await db
    .insert(users)
    .values({
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .onConflictDoNothing({ target: users.username })
    .returning({ id: users.id });

  if (!user) return { error: "Bu kullanıcı adı alınmış.", fields };

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fields = { username };

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Kullanıcı adı veya şifre hatalı.", fields };
  }

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await deleteSession();
  redirect("/");
}
