"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/duration";
import type { DayTotal } from "@/lib/stats";

// Son günlerin çalışma süresi: tek seri, sütunlar mavi (aksiyon rengi). Lamba sarısı açık kağıt
// zemin üzerinde okunmuyor (kontrast 1.3:1), "şu an çalışıyor" anlamı da onda kalsın.
const STEPS_MIN = [15, 30, 60, 120, 180, 240, 360];

const dayName = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", weekday: "long" });
const dayNum = new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric" });
const parse = (day: string) => new Date(`${day}T00:00:00Z`);

function ticks(maxSeconds: number) {
  const maxMin = maxSeconds / 60;
  const step = STEPS_MIN.find((s) => maxMin / s <= 4) ?? 480;
  const top = Math.max(step, Math.ceil(maxMin / step) * step);
  return { top: top * 60, values: Array.from({ length: top / step + 1 }, (_, i) => i * step * 60) };
}

const tickLabel = (seconds: number) => (seconds === 0 ? "0" : seconds % 3600 === 0 ? `${seconds / 3600} sa` : `${seconds / 60} dk`);

export function StudyChart({ days, today }: { days: DayTotal[]; today: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.seconds));
  const { top, values } = ticks(max);
  const peak = max > 0 ? days.findLastIndex((d) => d.seconds === max) : -1;

  return (
    <div>
      <div className="flex gap-2">
        {/* Y ekseni */}
        <div className="relative h-44 w-9 shrink-0 text-right text-[11px] text-ink-muted">
          {values.map((v) => (
            <span key={v} className="numerals absolute right-0 translate-y-1/2" style={{ bottom: `${(v / top) * 100}%` }}>
              {tickLabel(v)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-44">
            {values.map((v) => (
              <span key={v} aria-hidden className="absolute inset-x-0 h-px bg-rule" style={{ bottom: `${(v / top) * 100}%` }} />
            ))}
            <ol className="relative flex h-full items-end">
              {days.map((d, i) => {
                const height = (d.seconds / top) * 100;
                const label = `${dayName.format(parse(d.day))}: ${d.seconds > 0 ? formatDuration(d.seconds) : "çalışılmadı"}`;
                const edge = i < 2 ? "left-0" : i > days.length - 3 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <li
                    key={d.day}
                    tabIndex={0}
                    aria-label={label}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="relative flex h-full flex-1 items-end justify-center px-[1px]"
                  >
                    {d.seconds > 0 && (
                      <span
                        className={`w-full max-w-6 rounded-t-[4px] bg-accent transition-opacity ${active === i ? "opacity-75" : ""}`}
                        style={{ height: `${height}%` }}
                      />
                    )}
                    {i === peak && active !== i && (
                      <span
                        className="numerals absolute text-[11px] whitespace-nowrap text-ink-muted"
                        style={{ bottom: `calc(${height}% + 4px)` }}
                      >
                        {formatDuration(d.seconds)}
                      </span>
                    )}
                    {active === i && (
                      <span
                        role="tooltip"
                        className={`sheet absolute z-10 px-2.5 py-1.5 text-left whitespace-nowrap ${edge}`}
                        style={{ bottom: `calc(${Math.max(height, 0)}% + 8px)` }}
                      >
                        <span className="numerals block text-[15px] font-semibold text-ink">
                          {d.seconds > 0 ? formatDuration(d.seconds) : "Çalışılmadı"}
                        </span>
                        <span className="block text-[12px] text-ink-muted">{dayName.format(parse(d.day))}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
          {/* X ekseni: ayın günü; bugün koyu */}
          <ol aria-hidden className="mt-1.5 flex text-[11px] text-ink-muted">
            {days.map((d) => (
              <li key={d.day} className={`numerals flex-1 text-center ${d.day === today ? "font-semibold text-ink" : ""}`}>
                {dayNum.format(parse(d.day))}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-ink-muted hover:text-ink">
          Tablo olarak gör <span aria-hidden>›</span>
        </summary>
        <table className="mt-2 w-full text-[14px]">
          <thead>
            <tr className="border-b border-rule text-left text-[12px] text-ink-muted">
              <th className="py-1.5 font-medium">Gün</th>
              <th className="py-1.5 text-right font-medium">Çalışma</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day} className="border-b border-rule">
                <td className="py-1.5">{dayName.format(parse(d.day))}</td>
                <td className="numerals py-1.5 text-right">{d.seconds > 0 ? formatDuration(d.seconds) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
