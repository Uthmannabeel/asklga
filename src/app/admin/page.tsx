import Link from "next/link";
import { staffName } from "@/lib/auth";
import { listLgas } from "@/lib/queries";
import { signInAction } from "./actions";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const name = await staffName();
  const { error } = await searchParams;
  if (!name) {
    const configured = Boolean(process.env.ADMIN_PASSCODE);
    return (
      <section className="measure grid gap-4">
        <h1>Staff sign-in</h1>
        <p>The workspace is for LGA staff and councillors. It holds the private document index, the record editors, tickets and the data-gap queue.</p>
        {!configured ? <p style={{ color: "var(--danger)" }}>ADMIN_PASSCODE is not set on this server, so nobody can sign in. Set it in .env.local and restart.</p> : null}
        <form action={signInAction} className="grid gap-2 max-w-sm">
          <label htmlFor="name" className="small">Your name (shown on records you change)</label>
          <input id="name" name="name" required maxLength={80} autoComplete="name" />
          <label htmlFor="passcode" className="small">Workspace passcode</label>
          <input id="passcode" name="passcode" type="password" required autoComplete="current-password" />
          {error ? <p className="small" style={{ color: "var(--danger)" }}>That passcode did not match.</p> : null}
          <div><button type="submit" className="btn">Sign in</button></div>
        </form>
      </section>
    );
  }
  const lgas = await listLgas();
  return (
    <section className="grid gap-3">
      <h1>Choose a local government area</h1>
      <ul className="register">
        {lgas.map((l) => (
          <li key={l.id} className="register-row">
            <Link href={`/admin/${l.id}`} className="text-lg">{l.name}, {l.state}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
