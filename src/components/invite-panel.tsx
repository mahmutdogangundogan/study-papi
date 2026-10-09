"use client";

import { useState } from "react";

export function InvitePanel({ code, roomName }: { code: string; roomName: string }) {
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  function inviteUrl() {
    return `${window.location.origin}/join/${code}`;
  }

  async function copy(kind: "link" | "code") {
    try {
      await navigator.clipboard.writeText(kind === "link" ? inviteUrl() : code);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // panoya erişim yoksa sessizce geç
    }
  }

  async function share() {
    const data = { title: roomName, text: `"${roomName}" odasında birlikte çalışalım!`, url: inviteUrl() };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // kullanıcı paylaşımı iptal etti
        return;
      }
    }
    copy("link");
  }

  return (
    <section className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
      <h2 className="text-sm font-medium text-zinc-300">Arkadaşlarını davet et</h2>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => copy("code")}
          className="flex-1 rounded-xl bg-zinc-900 px-4 py-3 text-left font-mono text-lg font-semibold tracking-[0.2em] text-white ring-1 ring-white/10"
          title="Kodu kopyala"
        >
          {code.slice(0, 4)}-{code.slice(4)}
          <span className="ml-2 font-sans text-xs font-normal tracking-normal text-zinc-500">
            {copied === "code" ? "kopyalandı" : "kodu kopyala"}
          </span>
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => copy("link")}
          className="h-11 rounded-xl bg-white/5 text-sm font-medium text-white ring-1 ring-white/10"
        >
          {copied === "link" ? "Link kopyalandı ✓" : "Linki kopyala"}
        </button>
        <button type="button" onClick={share} className="h-11 rounded-xl bg-white text-sm font-semibold text-zinc-950">
          Paylaş
        </button>
      </div>
    </section>
  );
}
