// Okuma lambası: çalışırken yanar ve altına ışık konisi düşer
export function Lamp({ on, size = 28, className = "" }: { on: boolean; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 28 32"
      width={size}
      height={(size * 32) / 28}
      aria-hidden
      className={`shrink-0 overflow-visible ${className}`}
    >
      <path
        d="M7 13 L1 31 H27 L21 13 Z"
        className="lamp-cone"
        fill="var(--color-lamp)"
        opacity={on ? 0.55 : 0}
      />
      <path d="M14 1v4" stroke="var(--color-ink)" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M5.5 13a8.5 8 0 0 1 17 0z"
        fill={on ? "var(--color-ink)" : "var(--color-sheet)"}
        stroke="var(--color-ink)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle
        cx="14"
        cy="14.5"
        r="2.2"
        fill={on ? "var(--color-lamp)" : "var(--color-sheet)"}
        stroke={on ? "var(--color-lamp-ink)" : "var(--color-ink-muted)"}
        strokeWidth="1.2"
      />
    </svg>
  );
}
