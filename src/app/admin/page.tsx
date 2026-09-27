import Link from "next/link";
import { passcodeConfigured, staffName } from "@/lib/auth";
import { listLgas } from "@/lib/queries";
import { signInAction } from "./actions";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const name = await staffName();
  const { error, next } = await searchParams;
  if (!name) {
    const configured = passcodeConfigured();
    return (
      <section className="measure grid gap-4">
        <h1>Staff sign-in</h1>
        <p>The workspace is for LGA staff and councillors. It holds the private document index, the record editors, tickets and the data-gap queue.</p>
        {!configured ? (
          <p style={{ color: "var(--danger)" }}>
            The workspace passcode is not set on this server, or it is still the placeholder, so nobody can sign in. Set ADMIN_PASSCODE to a long passphrase in .env.local and restart.
          </p>
        ) : null}
        <form action={signInAction} className="grid gap-2 max-w-sm">
          <input type="hidden" name="next" value={next ?? ""} />
          <label htmlFor="name" className="small">Your name (shown on records you change)</label>
          <input id="name" name="name" required maxLength={80} autoComplete="name" />
          <label htmlFor="passcode" className="small">Workspace passcode</label>
          <input id="passcode" name="passcode" type="password" required autoComplete="current-password" />
          {error ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>That passcode did not match.</p> : null}
          <div><button type="submit" className="btn">Sign in</button></div>
        </form>
        <p className="small muted">Sessions last twelve hours. Five failed attempts a minute are allowed per connection.</p>
      </section>
    );
  }
  const lgas = await listLgas();
  return (
    <section className="grid gap-3">
      <h1>Choose a local government area</h1>
      {lgas.length === 0 ? <p className="muted">No LGA is set up on this server yet.</p> : null}
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
