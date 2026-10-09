"use client";

import { useActionState } from "react";
import { createRoom, joinByCode, type RoomFormState } from "@/actions/rooms";
import { Field, FormError, inputClass, primaryButtonClass } from "@/components/ui/form";

export function JoinByCodeForm() {
  const [state, action, pending] = useActionState<RoomFormState, FormData>(joinByCode, {});
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="code"
          aria-label="Oda kodu"
          placeholder="Oda kodu ya da davet linki"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          defaultValue={state.fields?.code}
          className={`${inputClass} font-mono uppercase placeholder:font-sans placeholder:normal-case`}
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="h-12 shrink-0 rounded-xl bg-white px-5 font-semibold text-zinc-950 transition active:scale-[0.98] disabled:opacity-60"
        >
          Katıl
        </button>
      </div>
      <FormError message={state.error} />
    </form>
  );
}

export function CreateRoomForm() {
  const [state, action, pending] = useActionState<RoomFormState, FormData>(createRoom, {});
  const visibility = state.fields?.visibility ?? "public";
  return (
    <form action={action} className="space-y-5">
      <Field
        label="Oda adı"
        name="name"
        required
        minLength={2}
        maxLength={60}
        placeholder="Örn. YKS Kampı"
        defaultValue={state.fields?.name}
      />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">Açıklama (isteğe bağlı)</span>
        <textarea
          name="description"
          rows={3}
          maxLength={280}
          defaultValue={state.fields?.description}
          className={`${inputClass} h-auto py-3`}
        />
      </label>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-zinc-300">Görünürlük</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { value: "public", title: "Public", body: "Herkes arayıp bulabilir ve katılabilir." },
            { value: "private", title: "Private", body: "Sadece davet linki ya da kodla katılınır." },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer gap-3 rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10 has-checked:bg-emerald-500/10 has-checked:ring-emerald-400/40"
            >
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                defaultChecked={visibility === opt.value}
                className="mt-1 accent-emerald-500"
              />
              <span>
                <span className="block font-medium text-white">{opt.title}</span>
                <span className="block text-sm text-zinc-400">{opt.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Oluşturuluyor…" : "Odayı oluştur"}
      </button>
    </form>
  );
}
