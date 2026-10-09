// "Çalışma günü" TSİ (Europe/Istanbul, UTC+3) ile gece 03.00'te başlar.
// Böylece gece yarısını geçen çalışmalar bir önceki güne sayılır.
export const STUDY_TZ = "Europe/Istanbul";
export const DAY_RESET_HOUR = 3;

const dayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: STUDY_TZ, dateStyle: "short" });

/** Verilen anın ait olduğu çalışma günü (karşılaştırma için anahtar) */
export function studyDayKey(ms: number) {
  return dayFmt.format(ms - DAY_RESET_HOUR * 60 * 60 * 1000);
}

const clockFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: STUDY_TZ,
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
});
const DAY_MS = 24 * 60 * 60 * 1000;

/** Verilen andan bir sonraki 03.00 sıfırlamasına kalan süre (ms) */
export function msUntilDayReset(ms: number) {
  const p = Object.fromEntries(clockFmt.formatToParts(ms).map((part) => [part.type, Number(part.value)]));
  const sinceMidnight = ((p.hour * 60 + p.minute) * 60 + p.second) * 1000 + (ms % 1000);
  return (((DAY_RESET_HOUR * 60 * 60 * 1000 - sinceMidnight) % DAY_MS) + DAY_MS) % DAY_MS || DAY_MS;
}
