import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HomeAsk } from "@/components/HomeAsk";
import type { FinderRow } from "@/components/LgaFinder";
import { directory, nationalSummary } from "@/lib/national";
import { listProjects, listServices } from "@/lib/queries";
import { dict, uiLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = {
  title: { absolute: "AskLGA: ask your local government, get the official answer" },
  description: "Ask any of Nigeria's 774 local governments a question in English, Pidgin, Hausa, Yoruba or Igbo, by text or voice. Answers come only from the council's published records, with the source shown.",
};

const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/**
 * One job on the home page, the way search and answer products do it: ask. Everything else
 * (the map, the money, how answers are checked, joining) is one door away, not stacked below.
 */
export default async function Home({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  // Old links to the map on the home page (/?state=RI#map) now live at /map.
  if (state) redirect(`/map?state=${encodeURIComponent(state)}`);

  const [rows, lang] = await Promise.all([directory(), uiLang()]);
  const t = dict(lang);
  const sum = await nationalSummary(rows);
  const pilot = rows.find((r) => r.id === "obio-akpor" && r.records > 0) ?? rows.find((r) => r.records > 0) ?? rows[0];
  const [projects, services] = await Promise.all([listProjects(pilot.id), listServices(pilot.id)]);
  const watched = projects.find((p) => p.status === "stalled") ?? projects.find((p) => p.status === "ongoing");
  const suggestions = [
    watched ? `What is happening with the ${watched.name}?` : null,
    services[0] ? `${services[0].name}: how does it work?` : null,
  ].filter((s): s is string => Boolean(s));
  const finderRows: FinderRow[] = rows.map((r) => [r.id, r.name, r.state, r.records > 0 ? 1 : 0]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-canvas">
        <section className="wrap home-ask">
          <h1>Ask your local government.</h1>
          <p className="home-sub">Type or speak in English, Pidgin, Hausa, Yoruba or Igbo. The answer comes only from the council&apos;s published records, and shows you which one.</p>
          <HomeAsk rows={finderRows} initialId={pilot.id} t={t} lang={lang} suggestions={suggestions} />
          <p className="home-trust">
            <span>No sign-up, no phone number</span>
            <span>Source on every answer</span>
            <span>All {sum.lgas} councils</span>
          </p>
        </section>

        <nav className="wrap doors" aria-label="More on AskLGA">
          <Link href="/map">
            <span className="door-n">01</span>
            <span className="door-t">Find your council on the map <Arrow /></span>
            <span className="door-d">{sum.lgas} local governments, {sum.states} states. Lit dots publish records.</span>
          </Link>
          <Link href="/money">
            <span className="door-n">02</span>
            <span className="door-t">Follow the money <Arrow /></span>
            <span className="door-d">What each council receives from the federation, month by month.</span>
          </Link>
          <Link href="/about-answers">
            <span className="door-n">03</span>
            <span className="door-t">How answers are checked <Arrow /></span>
            <span className="door-d">Published records only, never the open web. Accuracy scored in public.</span>
          </Link>
        </nav>

        <p className="wrap small muted py-10">
          Run a local government? <Link href="/join">Publish your records</Link>. Free and open source.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
