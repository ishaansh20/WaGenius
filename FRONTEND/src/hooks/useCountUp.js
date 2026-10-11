import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Smoothly animates a number from its previous value to `target`.
 * Real data in, animated display out: when `target` changes (new data
 * arrives) it eases from the old value instead of jumping.
 */
export default function useCountUp(target, { duration = 900 } = {}) {
  const safeTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [value, setValue] = useState(prefersReducedMotion() ? safeTarget : 0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(safeTarget);
      return undefined;
    }
    const from = fromRef.current;
    let frame;
    let start;
    const tick = (now) => {
      if (start === undefined) start = now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = from + (safeTarget - from) * eased;
      setValue(next);
      fromRef.current = next;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeTarget, duration]);

  return value;
}
