import Link from "next/link";
import { currentStaff } from "@/lib/auth";
import { listLgas } from "@/lib/queries";
import { directory } from "@/lib/national";
import { Mark } from "@/components/Wordmark";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await currentStaff();
  const all = session ? (await listLgas()).filter((l) => session.lgaId === null || l.id === session.lgaId) : [];
  // Server administrators would otherwise get all 774 councils in the bar: show those with records.
  const records = session && all.length > 1 ? new Map((await directory()).map((d) => [d.id, d.records])) : null;
  const lgas = records ? all.filter((l) => l.demo || (records.get(l.id) ?? 0) > 0) : all;
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b border-rule" style={{ background: "var(--canvas)" }}>
        <div className="wrap py-3 flex flex-wrap items-center gap-x-6 gap-y-1">
          <Link href="/" className="wordmark" aria-label="AskLGA home"><Mark /><span>AskLGA</span></Link>
          <span className="small muted">Staff workspace</span>
          {session ? (
            <nav aria-label="Workspace" className="flex flex-wrap gap-x-5 gap-y-0 small">
              {lgas.map((l) => (
                <Link key={l.id} href={`/admin/${l.id}`} className="nav-link">{l.name}</Link>
              ))}
              {records ? <Link href="/admin" className="nav-link">All councils</Link> : null}
              {session.role === "admin" ? <Link href="/admin/users" className="nav-link">Accounts</Link> : null}
              {session.role === "admin" ? <Link href="/admin/allocations" className="nav-link">Allocations</Link> : null}
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
      <main id="main" className="wrap py-8 grid gap-8">{children}</main>
    </>
  );
}
