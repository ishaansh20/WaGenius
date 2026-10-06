import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";

const VARIANTS = {
  primary:
    "bg-brand-900 text-white hover:bg-brand-800 active:bg-brand-950 shadow-[0_1px_2px_rgba(11,59,46,0.2)]",
  brand:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-[0_1px_2px_rgba(11,59,46,0.2)]",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-canvas hover:border-ink-subtle",
  ghost: "text-ink-muted hover:bg-brand-50 hover:text-brand-900",
  danger: "bg-danger text-white hover:bg-[#a51f1f]",
  "danger-ghost": "text-danger hover:bg-danger-soft",
  accent: "bg-accent text-brand-950 hover:bg-[#b9e650]",
};

const SIZES = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-[15px]",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
};

const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  const iconSize = size === "sm" || size === "icon-sm" ? 14 : 16;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap font-display font-medium transition-colors duration-150 disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={iconSize} className="animate-spin" />
      ) : (
        LeftIcon && <LeftIcon size={iconSize} />
      )}
      {children}
      {RightIcon && !loading && <RightIcon size={iconSize} />}
    </button>
  );
});

export default Button;
