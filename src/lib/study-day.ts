// "Çalışma günü" TSİ (Europe/Istanbul, UTC+3) ile gece 03.00'te başlar.
// Böylece gece yarısını geçen çalışmalar bir önceki güne sayılır.
export const STUDY_TZ = "Europe/Istanbul";
export const DAY_RESET_HOUR = 3;

const dayFmt = new Intl.DateTimeFormat("tr-TR", { timeZone: STUDY_TZ, dateStyle: "short" });

/** Verilen anın ait olduğu çalışma günü (karşılaştırma için anahtar) */
export function studyDayKey(ms: number) {
  return dayFmt.format(ms - DAY_RESET_HOUR * 60 * 60 * 1000);
}
