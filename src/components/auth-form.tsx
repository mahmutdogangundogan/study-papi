"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthFormState } from "@/actions/auth";
import { Field, FormError } from "@/components/ui/form";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    mode === "login" ? login : register,
    {},
  );
  const nextQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="space-y-6">
      {next && <input type="hidden" name="next" value={next} />}
      <Field
        label="Kullanıcı adı"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        defaultValue={state.fields?.username}
        hint={mode === "register" ? "3 ile 24 karakter arası. Harf, rakam, alt çizgi ve nokta olabilir." : undefined}
      />
      {mode === "register" && (
        <Field
          label="Görünen ad"
          name="displayName"
          autoComplete="nickname"
          hint="Odadakiler seni bu isimle görür."
          maxLength={40}
          defaultValue={state.fields?.displayName}
        />
      )}
      <Field
        label="Şifre"
        name="password"
        type="password"
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        minLength={mode === "register" ? 8 : undefined}
        required
        hint={mode === "register" ? "En az 8 karakter" : undefined}
      />
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "…" : mode === "login" ? "Giriş yap" : "Hesap oluştur"}
      </button>
      <p className="text-[15px] text-ink-muted">
        {mode === "login" ? (
          <>
            Hesabın yok mu?{" "}
            <Link href={`/register${nextQuery}`} className="font-semibold text-accent underline underline-offset-4">
              Kayıt ol
            </Link>
          </>
        ) : (
          <>
            Zaten hesabın var mı?{" "}
            <Link href={`/login${nextQuery}`} className="font-semibold text-accent underline underline-offset-4">
              Giriş yap
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
