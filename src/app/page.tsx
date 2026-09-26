import Link from "next/link";
import { listLgas } from "@/lib/queries";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function Home() {
  const lgas = await listLgas();
  const states = [...new Set(lgas.map((l) => l.state))];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 grid gap-8">
        <div className="measure grid gap-3">
          <h1>Ask your local government.</h1>
          <p className="text-lg">
            Services, projects, public assets and investment, answered in English, Pidgin, Hausa, Yoruba or Igbo, from approved records only, with the source stamped on every answer.
          </p>
        </div>
        <section className="grid gap-2">
          <h2>Choose your local government area</h2>
          {states.map((st) => (
            <div key={st} className="grid gap-1">
              <h3>{st} State</h3>
              <ul className="register">
                {lgas.filter((l) => l.state === st).map((l) => (
                  <li key={l.id} className="register-row">
                    <Link href={`/${l.id}`} className="text-lg">{l.name}</Link>
                    <span className="small muted">Headquarters {l.headquarters ?? "not recorded"}{l.demo ? ". Demo records." : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        <section className="measure grid gap-2 small muted">
          <p>AskLGA is a public good. The software is open source, the registers are open data, and no LGA pays to be listed.</p>
        </section>
      </main>
    </>
  );
}
