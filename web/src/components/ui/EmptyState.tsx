import type { ReactNode } from "react";
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border-input bg-surface p-8 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
