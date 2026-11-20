import { ButtonLink } from "@/components/ui/Button";
export default function NotFoundChat() {
  return <div className="mx-auto max-w-md px-4 py-16 text-center"><h1 className="text-xl font-bold">That chat isn&apos;t here</h1><p className="mt-2 text-text-muted">It may have been deleted, or it belongs to another account.</p><ButtonLink href="/app" className="mt-4">Start a new chat</ButtonLink></div>;
}
