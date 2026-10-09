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
      setTimeout(() => setCopied(null), 1400);
    } catch {
      // panoya erişim yoksa sessizce geç
    }
  }

  async function share() {
    if (!navigator.share) return copy("link");
    try {
      await navigator.share({ title: roomName, text: `"${roomName}" odasında birlikte çalışalım.`, url: inviteUrl() });
    } catch {
      // kullanıcı paylaşımı iptal etti
    }
  }

  return (
    <section aria-labelledby="invite-title">
      <h2 id="invite-title" className="font-serif text-[22px] font-bold">
        Davet bileti
      </h2>
      <p className="mt-1 text-[14px] text-ink-muted">Kodu ya da linki gönder; alan kişi doğrudan bu masaya oturur.</p>
      <div className="ticket relative mt-4 px-8 py-5 text-center">
        <p className="text-[13px] font-medium text-ink-muted">Oda kodu</p>
        <button
          type="button"
          onClick={() => copy("code")}
          title="Kodu kopyala"
          lang="en"
          className="numerals mt-1 text-[30px] font-semibold tracking-[0.08em]"
        >
          {code.slice(0, 4)}-{code.slice(4)}
        </button>
        {copied && (
          <span
            key={copied}
            className="stamp stamp-in absolute top-3 right-6 bg-sheet text-accent"
            style={{ transform: "rotate(-4deg)" }}
          >
            {copied === "code" ? "Kod kopyalandı" : "Link kopyalandı"}
          </span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => copy("link")} className="btn-secondary btn-sm">
          Linki kopyala
        </button>
        <button type="button" onClick={share} className="btn-primary btn-sm">
          Paylaş
        </button>
      </div>
    </section>
  );
}
