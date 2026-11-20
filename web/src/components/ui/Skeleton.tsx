import { cn } from "./cn";
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rounded-md bg-surface-2 animate-pulse motion-reduce:animate-none", className)} />;
}
