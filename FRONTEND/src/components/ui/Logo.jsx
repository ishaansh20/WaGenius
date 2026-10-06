import { cn } from "../../utils/cn";

export function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-9 w-9 shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="#0b3b2e" />
      <path
        d="M16 6.5c-5.5 0-9.8 3.9-9.8 8.9 0 2.6 1.2 4.9 3.1 6.5l-.9 3.6 4-1.9c1.1.4 2.3.6 3.6.6 5.5 0 9.8-3.9 9.8-8.8S21.5 6.5 16 6.5Z"
        fill="#fff"
      />
      <path
        d="m10.6 12.6 1.9 6 2.1-4.8 1.4 3.3 2.2-4.6 1.9 6.1"
        fill="none"
        stroke="#128c5e"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23.6" cy="8.4" r="2.6" fill="#c8f169" />
    </svg>
  );
}

export default function Logo({ className, markClassName, inverted = false, showWordmark = true }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      {showWordmark && (
        <span
          className={cn(
            "font-display text-[19px] font-semibold tracking-tight",
            inverted ? "text-white" : "text-brand-900",
          )}
        >
          Wagenius
        </span>
      )}
    </span>
  );
}
