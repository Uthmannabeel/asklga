/** Shown while a portal page's data loads on a slow connection, so a tap always gives feedback. */
export default function Loading() {
  return (
    <main className="wrap py-10 grid gap-4" aria-busy="true">
      <p className="small muted" role="status">Loading the records</p>
      <div style={{ height: "2rem", width: "60%", background: "var(--canvas)", borderRadius: 2 }} aria-hidden="true" />
      <div style={{ height: "1rem", width: "90%", background: "var(--canvas)", borderRadius: 2 }} aria-hidden="true" />
      <div style={{ height: "1rem", width: "80%", background: "var(--canvas)", borderRadius: 2 }} aria-hidden="true" />
    </main>
  );
}
