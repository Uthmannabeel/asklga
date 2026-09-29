import Link from "next/link";
import { PageHead } from "./PageHead";
import { getLga } from "@/lib/queries";
import { stateLabel, stateSlug } from "@/lib/ngTiles";

/** PageHead for a section of an LGA, with Nigeria / State / LGA breadcrumbs. */
export async function LgaPageHead({ lgaId, title, lede, children, extraCrumb }: { lgaId: string; title: string; lede?: string; children?: React.ReactNode; extraCrumb?: { href: string; label: string } }) {
  const row = await getLga(lgaId);
  if (!row) return null;
  const crumbs = [
    { href: "/", label: "Nigeria" },
    { href: `/state/${stateSlug(row.state)}`, label: stateLabel(row.state) },
    { href: `/${lgaId}`, label: row.name },
    ...(extraCrumb ? [extraCrumb] : []),
  ];
  return (
    <PageHead crumbs={crumbs} title={title} lede={lede}>
      {children}
    </PageHead>
  );
}

/** Shown when a council has not published a register yet. */
export function NotPublished({ what, name }: { what: string; name: string }) {
  return (
    <section className="empty measure">
      <p className="font-bold">{name} has not published its {what} yet</p>
      <p style={{ color: "var(--ink-2)" }}>
        When the council&apos;s data owner approves its {what}, each record appears here with its source and the date it was last checked, and the answer service can use it.
      </p>
      <p className="small"><Link href="/join">If you work for this council, see how to join</Link></p>
    </section>
  );
}
