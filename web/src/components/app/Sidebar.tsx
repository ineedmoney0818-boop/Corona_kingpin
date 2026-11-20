import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAccount, listChats } from "@/lib/data";
import { signOut } from "@/app/(auth)/actions";
import { buttonClass } from "@/components/ui/Button";
import { NavLink } from "./NavLink";
import { CreditBalance } from "./CreditBalance";

export async function Sidebar() {
  const user = await requireUser();
  const [chats, account] = await Promise.all([listChats(user.id), getAccount(user.id)]);
  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <Link href="/app" className="px-3 py-2 font-display text-xl font-extrabold">reel<span className="text-accent">plain</span></Link>
      <Link href="/app" className={buttonClass("primary", "md", "w-full my-2")}>New chat</Link>
      <nav aria-label="App">
        <NavLink href="/app/projects">Projects</NavLink>
        <NavLink href="/app/library">Library</NavLink>
        <NavLink href="/app/settings">Settings</NavLink>
      </nav>
      <h2 className="mt-4 px-3 text-xs font-medium text-text-muted">Chats</h2>
      <nav aria-label="Chats" className="min-h-0 flex-1 overflow-y-auto">
        {chats.length === 0 ? <p className="px-3 py-2 text-sm text-text-muted">Your chats show up here.</p>
          : chats.map((c) => <NavLink key={c.id} href={`/app/chats/${c.id}`}>{c.title}</NavLink>)}
      </nav>
      <CreditBalance account={account} plan={user.plan} />
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border px-3 pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.displayName}</p>
          <p className="truncate text-xs text-text-muted">{user.email}</p>
        </div>
        <form action={signOut}><button className={buttonClass("ghost", "sm")}>Sign out</button></form>
      </div>
    </div>
  );
}
