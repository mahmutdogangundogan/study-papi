import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinByCodeForm } from "@/components/room-forms";
import { JoinButton } from "@/components/join-button";
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
      <div className="space-y-6 pt-6 text-center">
        <div>
          <h1 className="text-xl font-semibold text-white">Davet geçersiz</h1>
          <p className="mt-1 text-sm text-zinc-400">Bu kod yanlış ya da oda sahibi kodu yenilemiş olabilir.</p>
        </div>
        <div className="text-left">
          <JoinByCodeForm />
        </div>
        <Link href="/rooms" className="inline-block text-sm text-emerald-400">
          Odalarıma dön
        </Link>
      </div>
    );
  }

  if (await isMember(room.id, user.id)) redirect(`/rooms/${room.id}`);

  return (
    <div className="pt-6">
      <div className="rounded-3xl bg-white/[0.03] p-6 text-center ring-1 ring-white/10">
        <p className="text-sm text-zinc-400">Seni bir çalışma odasına davet ettiler</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">{room.name}</h1>
        {room.description && <p className="mt-2 text-sm text-zinc-400">{room.description}</p>}
        <p className="mt-3 text-xs text-zinc-500">{room.memberCount} üye</p>
        <div className="mt-6">
          <JoinButton code={code} />
        </div>
      </div>
    </div>
  );
}
