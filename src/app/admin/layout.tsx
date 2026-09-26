import Link from "next/link";
import { staffName } from "@/lib/auth";
import { listLgas } from "@/lib/queries";
import { SignOutButton } from "./SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const name = await staffName();
  const lgas = name ? await listLgas() : [];
  return (
    <>
      <header className="border-b border-rule" style={{ background: "var(--field)" }}>
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Link href="/" className="no-underline text-ink font-bold">AskLGA</Link>
          <span className="small muted">Staff workspace</span>
          {name ? (
            <nav aria-label="Workspace" className="flex flex-wrap gap-x-5 gap-y-1 small">
              {lgas.map((l) => (
                <Link key={l.id} href={`/admin/${l.id}`}>{l.name}</Link>
              ))}
            </nav>
          ) : null}
          {name ? (
            <span className="ml-auto small flex items-center gap-3">
              <span className="muted">Signed in as {name}</span>
              <SignOutButton />
            </span>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 grid gap-8">{children}</main>
    </>
  );
}
