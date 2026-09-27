import { redirect } from "next/navigation";
import { currentStaff } from "@/lib/auth";
import { changeOwnPassword } from "../actions";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await currentStaff();
  if (!me) redirect("/admin");
  const { error, ok } = await searchParams;
  return (
    <section className="measure grid gap-4">
      <h1>Your account</h1>
      <table className="max-w-md">
        <tbody>
          <tr><th>Name</th><td>{me.name}</td></tr>
          <tr><th>Email</th><td>{me.email ?? "none (setup mode)"}</td></tr>
          <tr><th>Role</th><td>{me.role}</td></tr>
          <tr><th>LGA</th><td>{me.lgaId ?? "All LGAs"}</td></tr>
        </tbody>
      </table>
      {me.bootstrap ? (
        <p className="muted">You are signed in with the server passcode. Create your own account under Accounts, then sign in with it.</p>
      ) : (
        <form action={changeOwnPassword} className="grid gap-2 max-w-sm">
          <h2>Change password</h2>
          <label htmlFor="current" className="small">Current password</label>
          <input id="current" name="current" type="password" required autoComplete="current-password" />
          <label htmlFor="next" className="small">New password (at least 10 characters)</label>
          <input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" />
          {error === "current" ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>The current password did not match.</p> : null}
          {error && error !== "current" ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{decodeURIComponent(error)}</p> : null}
          {ok ? <p className="small" role="status">Password changed.</p> : null}
          <div><button type="submit" className="btn">Change password</button></div>
        </form>
      )}
    </section>
  );
}
