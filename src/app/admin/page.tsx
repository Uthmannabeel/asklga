import Link from "next/link";
import { activeUserCount, currentStaff, passcodeConfigured } from "@/lib/auth";
import { listLgas } from "@/lib/queries";
import { signInAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const session = await currentStaff();
  const { error, next } = await searchParams;
  if (!session) {
    const users = await activeUserCount();
    const bootstrap = users === 0;
    const configured = passcodeConfigured();
    return (
      <section className="measure grid gap-4">
        <h1>Staff sign-in</h1>
        <p>The workspace is for LGA staff and councillors. It holds the private document index, the record editors, tickets and the data-gap queue.</p>
        {bootstrap ? (
          <div className="stamp stamp-caution">
            <div><strong>First-run setup</strong></div>
            <div>No staff account exists yet. Sign in once with the server passcode, then create the first administrator account under Accounts. After that the passcode stops working.</div>
          </div>
        ) : null}
        {bootstrap && !configured ? (
          <p style={{ color: "var(--danger)" }}>
            The server passcode is not set, or it is still the placeholder, so nobody can sign in. Set ADMIN_PASSCODE to a long passphrase in .env.local and restart.
          </p>
        ) : null}
        <form action={signInAction} className="grid gap-2 max-w-sm">
          <input type="hidden" name="next" value={next ?? ""} />
          {bootstrap ? (
            <>
              <label htmlFor="identity" className="small">Your name (shown on records you change)</label>
              <input id="identity" name="identity" required maxLength={80} autoComplete="name" />
              <label htmlFor="secret" className="small">Server passcode</label>
              <input id="secret" name="secret" type="password" required autoComplete="current-password" />
            </>
          ) : (
            <>
              <label htmlFor="identity" className="small">Email</label>
              <input id="identity" name="identity" type="email" required maxLength={120} autoComplete="username" inputMode="email" />
              <label htmlFor="secret" className="small">Password</label>
              <input id="secret" name="secret" type="password" required autoComplete="current-password" />
            </>
          )}
          {error === "1" ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{bootstrap ? "That passcode did not match." : "That email and password did not match an active account."}</p> : null}
          {error === "lga" ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>Your account is not for that LGA.</p> : null}
          {error === "role" ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>Your role does not allow that action.</p> : null}
          <div><button type="submit" className="btn">Sign in</button></div>
        </form>
        <p className="small muted">Sessions last twelve hours. Five failed attempts a minute are allowed per connection. Ask your LGA administrator if you need an account or a password reset.</p>
      </section>
    );
  }
  const lgas = (await listLgas()).filter((l) => session.lgaId === null || l.id === session.lgaId);
  return (
    <section className="grid gap-3">
      <h1>{lgas.length === 1 ? "Your local government area" : "Choose a local government area"}</h1>
      {session.bootstrap ? (
        <div className="stamp stamp-caution">
          <div><strong>Setup mode</strong></div>
          <div>You are signed in with the server passcode. Create the first administrator account under <Link href="/admin/users">Accounts</Link>; this passcode will then stop working.</div>
        </div>
      ) : null}
      {error === "lga" ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>Your account is not for that LGA.</p> : null}
      {error === "role" ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>Your role does not allow that action.</p> : null}
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
