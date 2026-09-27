import Link from "next/link";
import { currentStaff } from "@/lib/auth";
import { listLgas } from "@/lib/queries";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentStaff();
  const lgas = session ? (await listLgas()).filter((l) => session.lgaId === null || l.id === session.lgaId) : [];
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b border-rule" style={{ background: "var(--field)" }}>
        <div className="mx-auto max-w-6xl px-4 py-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Link href="/" className="no-underline text-ink font-bold nav-link">AskLGA</Link>
          <span className="small muted">Staff workspace</span>
          {session ? (
            <nav aria-label="Workspace" className="flex flex-wrap gap-x-5 gap-y-0 small">
              {lgas.map((l) => (
                <Link key={l.id} href={`/admin/${l.id}`} className="nav-link">{l.name}</Link>
              ))}
              {session.role === "admin" ? <Link href="/admin/users" className="nav-link">Accounts</Link> : null}
              <Link href="/admin/account" className="nav-link">Account</Link>
            </nav>
          ) : null}
          {session ? (
            <span className="ml-auto small flex items-center gap-3">
              <span className="muted">{session.name} · {session.role}</span>
              <SignOutButton />
            </span>
          ) : null}
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-6 grid gap-8">{children}</main>
    </>
  );
}
