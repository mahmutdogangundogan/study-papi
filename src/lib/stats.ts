// Profil istatistikleri. getStudyHistory'nin (src/lib/data.ts) verdiği günlük toplamlardan hesaplanır;
// günler "YYYY-MM-DD" biçiminde çalışma günleridir (TSİ 03.00'te başlar).

/** Bir gün seriye sayılsın diye en az bu kadar çalışılmış olmalı */
export const STREAK_MIN_SECONDS = 60;
/** Haftalık ortalama en fazla son bu kadar haftaya bakar */
export const AVERAGE_WEEKS = 4;
export const CHART_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;
const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
export const addDays = (day: string, n: number) => new Date(toMs(day) + n * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / DAY_MS);

export type DayTotal = { day: string; seconds: number };

export function computeStats({ days, today, joinedDay }: { days: DayTotal[]; today: string; joinedDay: string }) {
  const byDay = new Map(days.map((d) => [d.day, d.seconds]));
  const secondsOn = (day: string) => byDay.get(day) ?? 0;
  const sumLast = (count: number) => {
    let total = 0;
    for (let i = 0; i < count; i++) total += secondsOn(addDays(today, -i));
    return total;
  };

  // Hafta pazartesi başlar
  const weekday = (new Date(toMs(today)).getUTCDay() + 6) % 7;

  // Yeni katılan biri için ortalamayı boş haftalarla düşürme: katıldığı günden bu yana kaç gün geçtiyse
  // (ilk çalışma daha eskiyse ondan) en fazla AVERAGE_WEEKS hafta
  const firstDay = days.length && days[0].day < joinedDay ? days[0].day : joinedDay;
  const activeDays = Math.max(1, daysBetween(firstDay, today) + 1);
  const averageWeeks = Math.min(AVERAGE_WEEKS, Math.ceil(activeDays / 7));

  // Seri: bugün henüz çalışmadıysa dün biten seri hâlâ sürüyor sayılır
  const counts = (day: string) => secondsOn(day) >= STREAK_MIN_SECONDS;
  let currentStreak = 0;
  for (let day = counts(today) ? today : addDays(today, -1); counts(day); day = addDays(day, -1)) currentStreak++;

  let longestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const d of days) {
    if (d.seconds < STREAK_MIN_SECONDS) continue;
    run = previous && daysBetween(previous, d.day) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = d.day;
  }

  const best = days.reduce<DayTotal | null>((a, d) => (!a || d.seconds > a.seconds ? d : a), null);

  return {
    todaySeconds: secondsOn(today),
    weekSeconds: sumLast(weekday + 1),
    weeklyAverageSeconds: Math.round(sumLast(averageWeeks * 7) / averageWeeks),
    averageWeeks,
    dailyAverageSeconds: Math.round(sumLast(Math.min(7, activeDays)) / Math.min(7, activeDays)),
    currentStreak,
    longestStreak,
    totalSeconds: days.reduce((sum, d) => sum + d.seconds, 0),
    bestDay: best && best.seconds > 0 ? best : null,
    lastDays: Array.from({ length: CHART_DAYS }, (_, i) => {
      const day = addDays(today, i - CHART_DAYS + 1);
      return { day, seconds: secondsOn(day) };
    }),
  };
}

export type ProfileStats = ReturnType<typeof computeStats>;
