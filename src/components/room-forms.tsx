"use client";

import { useActionState } from "react";
import { createRoom, joinByCode, type RoomFormState } from "@/actions/rooms";
import { Field, FormError } from "@/components/ui/form";

export function JoinByCodeForm() {
  const [state, action, pending] = useActionState<RoomFormState, FormData>(joinByCode, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="block text-[13px] font-medium text-ink-muted">Davet kodu ya da linki</span>
        <div className="flex items-end gap-3">
          {/* lang="en": Türkçe büyük harf dönüşümünde i → İ olup kodu bozmasın */}
          <input
            name="code"
            lang="en"
            placeholder="XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            defaultValue={state.fields?.code}
            className="field numerals h-14 text-[24px] font-semibold tracking-[0.12em] uppercase placeholder:tracking-[0.12em]"
            required
          />
          <button type="submit" disabled={pending} className="btn-secondary btn-sm mb-1 shrink-0">
            Katıl
          </button>
        </div>
      </label>
      <FormError message={state.error} />
    </form>
  );
}

export function CreateRoomForm() {
  const [state, action, pending] = useActionState<RoomFormState, FormData>(createRoom, {});
  const visibility = state.fields?.visibility ?? "public";
  return (
    <form action={action} className="space-y-7">
      <Field
        label="Odanın adı"
        name="name"
        required
        minLength={2}
        maxLength={60}
        placeholder="Örneğin: YKS Kampı"
        defaultValue={state.fields?.name}
      />
      <label className="block">
        <span className="block text-[13px] font-medium text-ink-muted">Kısa bir not (isteğe bağlı)</span>
        <textarea
          name="description"
          rows={3}
          maxLength={280}
          placeholder="Bu odada ne çalışılıyor?"
          defaultValue={state.fields?.description}
          className="field"
        />
      </label>
      <fieldset>
        <legend className="text-[13px] font-medium text-ink-muted">Kim girebilir?</legend>
        <div className="mt-2 divide-y divide-rule border-y border-rule">
          {[
            {
              value: "public",
              title: "Herkese açık",
              body: "Keşfet’te listelenir. Arayan herkes bulup katılabilir.",
            },
            {
              value: "private",
              title: "Özel",
              body: "Listelenmez. Sadece davet linki ya da koduyla katılınır.",
            },
          ].map((opt) => (
            <label key={opt.value} className="flex cursor-pointer gap-3.5 py-4">
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                defaultChecked={visibility === opt.value}
                className="peer mt-1 size-[18px] shrink-0 accent-accent"
              />
              <span>
                <span className="block font-semibold">{opt.title}</span>
                <span className="block text-[14px] text-ink-muted">{opt.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormError message={state.error} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Oda açılıyor…" : "Odayı aç"}
      </button>
    </form>
  );
}
