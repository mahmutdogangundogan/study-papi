import Link from "next/link";
import { Lamp } from "./lamp";

type Props = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  studyingCount: number;
  stamp?: { label: string; tone: "ink" | "accent" };
  action?: React.ReactNode;
};

// Defter satırı: kart yok, sadece çizgi. Odada biri çalışıyorsa lamba yanar.
export function RoomRow({ id, name, description, memberCount, studyingCount, stamp, action }: Props) {
  const live = studyingCount > 0;
  return (
    <li className="relative flex min-h-[72px] items-center pr-4 hover:bg-sheet/60 sm:pr-2">
      <span className="flex w-[52px] shrink-0 justify-center self-stretch pt-4">
        <Lamp on={live} size={24} />
      </span>
      <div className="min-w-0 flex-1 py-3.5 pl-3.5">
        <div className="flex items-center gap-2.5">
          <Link href={`/rooms/${id}`} className="truncate text-[17px] font-semibold after:absolute after:inset-0">
            {name}
          </Link>
          {stamp && (
            <span className={`stamp ${stamp.tone === "accent" ? "text-accent" : "text-ink-muted"}`}>{stamp.label}</span>
          )}
        </div>
        {description && <p className="mt-0.5 truncate text-[14px] text-ink-muted">{description}</p>}
        <p className="mt-1 text-[13px] text-ink-muted">
          <span className="numerals">{memberCount}</span> üye.{" "}
          {live ? (
            <span className="font-medium text-lamp-ink">
              Şu an <span className="numerals">{studyingCount}</span> kişi çalışıyor.
            </span>
          ) : (
            "Şu an kimse çalışmıyor."
          )}
        </p>
      </div>
      {action && <div className="relative z-10 shrink-0 pl-3">{action}</div>}
    </li>
  );
}
