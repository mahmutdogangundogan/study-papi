import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lamp } from "@/components/lamp";
import { StudyChart } from "@/components/study-chart";
import { getProfileUser, getStudyHistory } from "@/lib/data";
import { formatDuration } from "@/lib/duration";
import { requireUser } from "@/lib/session";
import { computeStats } from "@/lib/stats";

export const metadata: Metadata = { title: "Profil" };

const monthFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long" });

export default async function ProfilePage({ params }: PageProps<"/profile/[username]">) {
  const { username } = await params;
  const me = await requireUser(`/profile/${username}`);
  const profile = await getProfileUser(decodeURIComponent(username));
  if (!profile) notFound();

  const history = await getStudyHistory(profile.id);
  const stats = computeStats({ days: history.days, today: history.today, joinedDay: profile.joinedDay });
  const isMe = profile.id === me.id;

  return (
    <div className="space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-[30px] leading-tight font-bold">
            {profile.displayName}
            {isMe && <span className="font-normal text-ink-muted"> (sen)</span>}
          </h1>
          <p className="mt-1 text-ink-muted">
            @{profile.username} · {monthFmt.format(profile.createdAt)} tarihinden beri burada
          </p>
        </div>
        <p className="flex shrink-0 flex-col items-center gap-1 pt-1 text-[12px] text-ink-muted">
          <Lamp on={history.studying} size={28} />
          {history.studying ? <span className="font-medium text-lamp-ink">çalışıyor</span> : "molada"}
        </p>
      </header>

      <section aria-label="İstatistikler">
        <dl className="grid grid-cols-2 border-t border-l border-rule sm:grid-cols-3">
          <Stat label="Bugün" value={formatDuration(stats.todaySeconds)} />
          <Stat label="Bu hafta" value={formatDuration(stats.weekSeconds)} note="pazartesiden beri" />
          <Stat
            label="Haftalık ortalama"
            value={formatDuration(stats.weeklyAverageSeconds)}
            note={stats.averageWeeks === 1 ? "son 1 hafta" : `son ${stats.averageWeeks} hafta`}
          />
          <Stat label="Günlük ortalama" value={formatDuration(stats.dailyAverageSeconds)} note="son 7 gün" />
          <Stat
            label="Seri"
            value={`${stats.currentStreak} gün`}
            note={stats.longestStreak > stats.currentStreak ? `en uzun ${stats.longestStreak} gün` : "art arda çalışılan gün"}
          />
          <Stat label="Toplam" value={formatDuration(stats.totalSeconds)} />
        </dl>
        {(stats.bestDay || history.longestSession > 0) && (
          <p className="mt-3 text-[14px] text-ink-muted">
            {stats.bestDay && (
              <>
                En verimli gün {dayFmt.format(new Date(`${stats.bestDay.day}T00:00:00Z`))},{" "}
                <span className="numerals text-ink">{formatDuration(stats.bestDay.seconds)}</span>.{" "}
              </>
            )}
            {history.longestSession > 0 && (
              <>
                En uzun oturum <span className="numerals text-ink">{formatDuration(history.longestSession)}</span>.
              </>
            )}
          </p>
        )}
      </section>

      <section aria-labelledby="chart-title">
        <h2 id="chart-title" className="font-serif text-[22px] font-bold">
          Son 14 gün
        </h2>
        <p className="mt-1 mb-5 text-[14px] text-ink-muted">Günlük çalışma süresi. Gün gece 03.00’te başlar.</p>
        <StudyChart days={stats.lastDays} today={history.today} />
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-r border-b border-rule px-4 py-4">
      <dt className="text-[13px] font-medium text-ink-muted">{label}</dt>
      <dd className="numerals mt-1 text-[22px] leading-tight font-medium">{value}</dd>
      {note && <dd className="mt-0.5 text-[12px] text-ink-muted">{note}</dd>}
    </div>
  );
}
