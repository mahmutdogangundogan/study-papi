import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinButton } from "@/components/join-button";
import { JoinByCodeForm } from "@/components/room-forms";
import { getRoomByCode, isMember } from "@/lib/data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Odaya katıl" };

// Davet linki: /join/KOD. Katılma GET ile değil butonla olur (link önizlemeleri yanlışlıkla katılmasın)
export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const user = await requireUser(`/join/${code}`);
  const room = await getRoomByCode(code);

  if (!room) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="font-serif text-[30px] leading-tight font-bold">Bu davet geçersiz</h1>
          <p className="mt-1.5 text-ink-muted">
            Kod yanlış yazılmış olabilir ya da oda sahibi kodu yenilemiştir. Yeni kodu ondan iste.
          </p>
        </header>
        <JoinByCodeForm />
        <Link href="/rooms" className="inline-block font-medium text-accent underline underline-offset-4">
          Odalarıma dön
        </Link>
      </div>
    );
  }

  if (await isMember(room.id, user.id)) redirect(`/rooms/${room.id}`);

  return (
    <div className="space-y-8">
      <p className="font-serif text-[15px] text-ink-muted italic">Bir masaya davet edildin:</p>
      <div className="ticket px-8 py-7 text-center">
        <h1 className="font-serif text-[28px] leading-tight font-bold">{room.name}</h1>
        {room.description && <p className="mt-2 text-ink-muted">{room.description}</p>}
        <p className="mt-3 text-[13px] text-ink-muted">
          Masada <span className="numerals">{room.memberCount}</span> kişi var.
        </p>
      </div>
      <JoinButton code={code} />
    </div>
  );
}
