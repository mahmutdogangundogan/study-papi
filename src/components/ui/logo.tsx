import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-base font-semibold tracking-tight text-white">
      <span className="grid size-8 place-items-center rounded-xl bg-emerald-500 text-emerald-950">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2 2M9 2h6" strokeLinecap="round" />
        </svg>
      </span>
      Study Papi
    </Link>
  );
}
