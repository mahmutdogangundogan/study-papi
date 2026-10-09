import type { ComponentProps } from "react";

export function Field({ label, hint, ...props }: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink-muted">{label}</span>
      <input {...props} className={`field ${props.className ?? ""}`} />
      {hint && <span className="mt-1.5 block text-[13px] text-ink-muted">{hint}</span>}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex gap-2 text-[15px] text-danger">
      <span aria-hidden className="font-serif font-bold">!</span>
      {message}
    </p>
  );
}
