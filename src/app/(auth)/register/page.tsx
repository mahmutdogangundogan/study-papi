import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Kayıt ol" };

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Hesap oluştur</h1>
      <p className="mt-1.5 text-sm text-zinc-400">Kullanıcı adı ve şifre seç, hemen çalışmaya başla.</p>
      <div className="mt-8">
        <Suspense>
          <RegisterForm searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function RegisterForm({ searchParams }: Pick<PageProps<"/register">, "searchParams">) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getCurrentUser()) redirect(target);
  return <AuthForm mode="register" next={typeof next === "string" ? target : undefined} />;
}
