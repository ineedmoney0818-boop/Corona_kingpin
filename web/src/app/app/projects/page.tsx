import type { Metadata } from "next";
import { Suspense } from "react";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createProject, listAssets, listProjects } from "@/lib/data";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Projects" };

async function newProject(form: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  if (name) await createProject(user.id, name);
  revalidatePath("/app/projects");
}

async function List() {
  const user = await requireUser();
  const [projects, assets] = await Promise.all([listProjects(user.id), listAssets(user.id)]);
  return (
    <>
      {projects.length === 0
        ? <EmptyState title="No projects yet">Projects keep your clips together. Make one, or just start a chat.</EmptyState>
        : <ul className="grid gap-3 sm:grid-cols-2">{projects.map((p) => (
            <li key={p.id} className="rounded-lg border border-border bg-surface p-4"><h2 className="truncate font-semibold" title={p.name}>{p.name}</h2>
              <p className="text-sm text-text-muted">{assets.filter((a) => a.projectId === p.id).length} files</p></li>))}</ul>}
      <h2 className="mt-8 text-lg font-bold">All uploads</h2>
      {assets.length === 0 ? <p className="mt-2 text-sm text-text-muted">Files you attach in a chat land here.</p> : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {assets.map((a) => (
            <li key={a.id} className="overflow-hidden rounded-md border border-border bg-surface">
              {a.kind === "image"
                // eslint-disable-next-line @next/next/no-img-element -- private, owner-only file
                ? <img src={`/api/files/${a.storageKey}`} alt={a.fileName} className="aspect-square w-full object-cover" />
                : <video src={`/api/files/${a.storageKey}`} className="aspect-square w-full object-cover" muted preload="metadata" aria-label={a.fileName} />}
              <p className="truncate px-2 py-1.5 text-xs" title={a.fileName}>{a.kind === "video" ? "🎬" : "🖼"} {a.fileName}</p>
            </li>))}
        </ul>)}
    </>
  );
}

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-[var(--layout-content-max)] px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Projects</h1>
        <form action={newProject} className="flex gap-2">
          <label htmlFor="pname" className="sr-only">Project name</label>
          <input id="pname" name="name" required maxLength={120} placeholder="New project name" className={inputClass + " w-56"} />
          <Button type="submit" variant="secondary">Make project</Button>
        </form>
      </div>
      <div className="mt-6"><Suspense fallback={<div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>}><List /></Suspense></div>
    </div>
  );
}
