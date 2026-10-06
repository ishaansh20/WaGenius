import { cn } from "../../utils/cn";

export default function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-lg bg-[#eceee9]", className)} />;
}
