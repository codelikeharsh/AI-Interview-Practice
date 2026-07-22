const TONES = {
  neutral: "bg-text-tertiary",
  active: "bg-accent",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-red-400",
};

export default function StatusDot({ tone = "neutral", label, pulse = false, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-secondary ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${TONES[tone]} ${pulse ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}
