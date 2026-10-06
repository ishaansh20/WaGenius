import { cn } from "../../utils/cn";

export default function PageHeader({ eyebrow, title, description, actions, className, children }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[14px] font-medium text-brand-600">{eyebrow}</p>
        )}
        <h1 className="text-[26px] font-semibold text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-ink-muted">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
