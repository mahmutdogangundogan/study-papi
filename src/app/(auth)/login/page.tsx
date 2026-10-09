import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser, safeNext } from "@/lib/session";

export const metadata: Metadata = { title: "Giriş yap" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Tekrar hoş geldin</h1>
      <p className="mt-1.5 text-sm text-zinc-400">Kullanıcı adın ve şifrenle giriş yap.</p>
      <div className="mt-8">
        <Suspense>
          <LoginForm searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function LoginForm({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getCurrentUser()) redirect(target);
  return <AuthForm mode="login" next={typeof next === "string" ? target : undefined} />;
}
