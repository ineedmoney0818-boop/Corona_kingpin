export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh grid place-items-center px-4 py-12 bg-surface">{children}</main>;
}
