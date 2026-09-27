/** Shown while a portal page's data loads on a slow connection, so a tap always gives feedback. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 grid gap-4" aria-busy="true">
      <p className="small muted" role="status">Loading the records</p>
      <div style={{ height: "2rem", width: "60%", background: "var(--field)", borderRadius: 2 }} aria-hidden="true" />
      <div style={{ height: "1rem", width: "90%", background: "var(--field)", borderRadius: 2 }} aria-hidden="true" />
      <div style={{ height: "1rem", width: "80%", background: "var(--field)", borderRadius: 2 }} aria-hidden="true" />
    </main>
  );
}
