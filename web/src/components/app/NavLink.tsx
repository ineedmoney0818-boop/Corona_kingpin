"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

export function NavLink({ href, children, exact }: { href: string; children: React.ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link href={href} aria-current={active ? "page" : undefined} title={typeof children === "string" ? children : undefined}
      className={cn("block truncate rounded-md px-3 py-2 text-sm", active ? "bg-accent-subtle text-accent font-semibold" : "text-text hover:bg-surface-2")}>
      {children}
    </Link>
  );
}
