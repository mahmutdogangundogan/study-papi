import Link from "next/link";

type Props = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  studyingCount: number;
  badge?: string;
  action?: React.ReactNode;
};

export function RoomCard({ id, name, description, memberCount, studyingCount, badge, action }: Props) {
  return (
    <li className="relative flex items-center gap-3 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.06]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/rooms/${id}`} className="truncate font-semibold text-white after:absolute after:inset-0">
            {name}
          </Link>
          {badge && (
            <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-white/10">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="mt-0.5 truncate text-sm text-zinc-400">{description}</p>}
        <p className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${studyingCount > 0 ? "bg-emerald-400" : "bg-zinc-600"}`} />
            <span className={studyingCount > 0 ? "text-emerald-300" : undefined}>{studyingCount} çalışıyor</span>
          </span>
          <span>{memberCount} üye</span>
        </p>
      </div>
      {action ? <div className="relative z-10 shrink-0">{action}</div> : <span className="text-zinc-600">›</span>}
    </li>
  );
}
