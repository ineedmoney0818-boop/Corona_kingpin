"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Under lg the sidebar lives in a drawer: a native <dialog> (focus trap, Esc to close). */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => { ref.current?.close(); }, [path]);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal(); else if (!open && d.open) d.close();
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Open menu"
        className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-2 lg:hidden">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      <dialog ref={ref} onClose={() => setOpen(false)} aria-label="Menu"
        className="m-0 h-dvh max-h-dvh w-[min(85vw,var(--layout-sidebar))] bg-surface text-text backdrop:bg-overlay lg:hidden">
        <button type="button" onClick={() => setOpen(false)} className="absolute right-2 top-2 inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-2" aria-label="Close menu">✕</button>
        {children}
      </dialog>
    </>
  );
}
