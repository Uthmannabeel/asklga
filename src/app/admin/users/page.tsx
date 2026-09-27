import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { currentStaff } from "@/lib/auth";
import { listLgas } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { createStaffUser, updateStaffUser } from "../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  fields: "Enter a valid email address and a name.",
  exists: "An account with that email already exists.",
  scope: "You can only manage accounts for your own LGA, and cannot create server administrators.",
  self: "You cannot deactivate or demote your own account.",
  lastadmin: "That is the last active administrator; add another before changing it.",
};

export default async function Users({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const me = await currentStaff();
  if (!me) redirect("/admin");
  if (me.role !== "admin") redirect("/admin?error=role");
  const { error, ok } = await searchParams;
  const db = await getDb();
  const all = await db.select().from(s.staffUsers).orderBy(asc(s.staffUsers.lgaId), asc(s.staffUsers.name));
  const users = me.lgaId ? all.filter((u) => u.lgaId === me.lgaId) : all;
  const lgas = (await listLgas()).filter((l) => me.lgaId === null || l.id === me.lgaId);
  return (
    <>
      <section className="grid gap-3">
        <h1>Accounts</h1>
        <p className="measure small">
          One account per officer. <strong>Admin</strong> manages accounts and everything below. <strong>Editor</strong> changes records and closes gaps, flags and tickets. <strong>Viewer</strong> reads the workspace and uses the internal search. An account bound to an LGA sees only that LGA; a server administrator sees every LGA.
        </p>
        {error ? <p className="small" role="alert" style={{ color: "var(--danger)" }}>{ERRORS[error] ?? decodeURIComponent(error)}</p> : null}
        {ok === "created" ? <p className="small" role="status">Account created. Give the officer the email and password; they can change the password under Account.</p> : null}
        {ok === "saved" ? <p className="small" role="status">Saved.</p> : null}
        {users.length === 0 ? <p className="muted">No accounts yet.</p> : null}
        <div className="table-scroll">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>LGA</th><th>Role</th><th>Active</th><th>Last sign-in</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.lgaId ?? "All LGAs"}</td>
                  <td colSpan={2}>
                    <form action={updateStaffUser} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} aria-label={`Role for ${u.name}`} style={{ width: "auto" }}>
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <select name="active" defaultValue={u.active ? "yes" : "no"} aria-label={`Active for ${u.name}`} style={{ width: "auto" }}>
                        <option value="yes">Active</option>
                        <option value="no">Disabled</option>
                      </select>
                      <input name="password" type="password" placeholder="New password (optional)" autoComplete="new-password" style={{ width: "14rem" }} aria-label={`New password for ${u.name}`} />
                      <button type="submit" className="btn btn-sm">Save</button>
                    </form>
                  </td>
                  <td className="small muted">{u.lastSignIn ? formatDate(u.lastSignIn) : "never"}</td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="grid gap-3">
        <h2>Add an account</h2>
        <form action={createStaffUser} className="grid gap-3 max-w-xl">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-1"><label htmlFor="u-name" className="small">Name (shown on records they change)</label><input id="u-name" name="name" required maxLength={80} autoComplete="off" /></div>
            <div className="grid gap-1"><label htmlFor="u-email" className="small">Email (used to sign in)</label><input id="u-email" name="email" type="email" required maxLength={120} autoComplete="off" /></div>
            <div className="grid gap-1">
              <label htmlFor="u-lga" className="small">LGA</label>
              <select id="u-lga" name="lgaId" defaultValue={me.lgaId ?? lgas[0]?.id ?? "*"}>
                {me.lgaId === null ? <option value="*">All LGAs (server administrator)</option> : null}
                {lgas.map((l) => <option key={l.id} value={l.id}>{l.name}, {l.state}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <label htmlFor="u-role" className="small">Role</label>
              <select id="u-role" name="role" defaultValue="editor">
                {me.lgaId === null ? <option value="admin">Admin</option> : null}
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="grid gap-1 md:col-span-2"><label htmlFor="u-pw" className="small">Initial password (at least 10 characters; the officer should change it)</label><input id="u-pw" name="password" type="password" required minLength={10} autoComplete="new-password" /></div>
          </div>
          <div><button type="submit" className="btn">Create account</button></div>
        </form>
      </section>
    </>
  );
}
