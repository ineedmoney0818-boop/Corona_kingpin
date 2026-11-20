import { cn } from "./cn";
import type { ReactNode } from "react";

const tone = {
  success: "bg-success-subtle border-l-4 border-success text-text",
  danger: "bg-danger-subtle text-danger",
  warning: "bg-warning-subtle text-warning font-semibold",
  neutral: "bg-surface border border-border text-text",
} as const;
export function Notice({ kind = "neutral", children, className, role }: { kind?: keyof typeof tone; children: ReactNode; className?: string; role?: "status" | "alert" }) {
  return <div role={role} className={cn("rounded-md px-3.5 py-3 text-sm", tone[kind], className)}>{children}</div>;
}
