import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-baseline gap-1.5 font-serif text-[21px] font-bold tracking-tight text-ink">
      Study
      <span className="italic font-medium text-accent">Papi</span>
    </Link>
  );
}
