import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { TalkMode } from "@/components/TalkMode";
import { dict, uiLang } from "@/lib/i18n";
import { talkDict } from "@/lib/talkStrings";
import { getLga, listProjects, listServices } from "@/lib/queries";
import { stateLabel } from "@/lib/ngTiles";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const row = await getLga(lga);
  if (!row) return { title: "Talk" };
  return {
    title: `Talk to ${row.name} LGA`,
    description: `Speak to ${row.name} Local Government Area in English, Pidgin, Hausa, Yoruba or Igbo and hear the answer read back from its published records.`,
    alternates: { canonical: `${SITE_URL}/${lga}/talk` },
  };
}

/** The hands-free page: one orb, the conversation, and a typed fallback. Chrome kept to the header. */
export default async function TalkPage({ params }: { params: Promise<{ lga: string }> }) {
  const { lga } = await params;
  const [row, projects, services, lang] = await Promise.all([getLga(lga), listProjects(lga), listServices(lga), uiLang()]);
  if (!row) notFound();
  const t = dict(lang);
  const tt = talkDict(lang);
  const watched = projects.find((p) => p.status === "stalled") ?? projects.find((p) => p.status === "ongoing");
  const suggestions = [
    watched ? `What is happening with the ${watched.name}?` : null,
    services[0] ? `${services[0].name}: how does it work?` : null,
    projects.some((p) => p.status === "stalled") ? "Which projects are stalled?" : null,
  ].filter((s): s is string => Boolean(s));

  return (
    <>
      <SiteHeader lga={row} demo={row.demo} compiled={row.compiled} back={`/${lga}/talk`} />
      <main id="main" className="talk-page">
        <div className="wrap talk-wrap">
          <header className="grid gap-2">
            <p className="eyebrow">{row.name} Local Government, {stateLabel(row.state)} <span aria-hidden="true">·</span> <Link href="/">{tt.changeCouncil}</Link></p>
            <h1>{tt.title.replace("%lga", row.name)}</h1>
            <p className="lede measure">{tt.lede}</p>
          </header>
          <TalkMode lgaId={lga} lgaName={row.name} lang={lang} t={tt} suggestions={suggestions} />
          <p className="small muted" style={{ borderTop: "1px solid var(--rule)", paddingTop: "1rem" }}>
            {t.footer.answersFrom} <Link href="/about-answers">{t.footer.howChecked}</Link> <span aria-hidden="true">·</span> <Link href="/privacy">{t.footer.privacy}</Link>
          </p>
        </div>
      </main>
    </>
  );
}
