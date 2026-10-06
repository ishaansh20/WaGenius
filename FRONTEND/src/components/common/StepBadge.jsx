export default function StepBadge({ n, label }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-900 text-[12px] font-semibold text-white tabular-nums">
        {n}
      </span>
      <span className="text-[15px] font-semibold text-ink">{label}</span>
    </div>
  );
}
