import type { ComponentProps } from "react";

export const inputClass =
  "h-12 w-full rounded-xl bg-white/5 px-4 text-base text-white ring-1 ring-white/10 placeholder:text-zinc-500 focus:bg-white/[0.07] focus:ring-2 focus:ring-emerald-400/60 focus:outline-none";

export function Field({ label, hint, ...props }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
      <input {...props} className={inputClass} />
      {hint && <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-400/20">
      {message}
    </p>
  );
}

export const primaryButtonClass =
  "inline-flex h-12 w-full items-center justify-center rounded-xl bg-emerald-500 px-5 text-base font-semibold text-emerald-950 transition hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex h-12 items-center justify-center rounded-xl bg-white/5 px-5 text-base font-medium text-white ring-1 ring-white/10 transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-60";
