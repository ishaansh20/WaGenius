import useCountUp from "../../hooks/useCountUp";

/**
 * Counts up to `value` when it first appears and whenever the real value changes.
 * `format` receives the in-flight number, e.g. (n) => compact.format(n).
 */
export default function AnimatedNumber({ value, format, duration, className }) {
  const current = useCountUp(value, { duration });
  const rounded = Math.round(current);
  return <span className={className}>{format ? format(rounded) : rounded.toLocaleString("en-IN")}</span>;
}
