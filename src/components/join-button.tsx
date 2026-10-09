"use client";

import { useActionState } from "react";
import { joinByCode, type RoomFormState } from "@/actions/rooms";
import { FormError, primaryButtonClass } from "@/components/ui/form";

export function JoinButton({ code }: { code: string }) {
  const [state, action, pending] = useActionState<RoomFormState, FormData>(joinByCode, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Katılınıyor…" : "Odaya katıl"}
      </button>
      <FormError message={state.error} />
    </form>
  );
}
