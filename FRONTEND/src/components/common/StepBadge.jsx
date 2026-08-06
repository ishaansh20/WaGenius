export default function StepBadge({ n, label }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
        {n}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}
