import { formatDate } from "@/lib/format";
import { dict, uiLang } from "@/lib/i18n";

/**
 * The source stamp: the one element allowed to be loud. Every public record carries it so a
 * reader always sees where a record came from, that the data owner approved it, and when it
 * was last confirmed. `compact` is the one-line form for list rows.
 */
export async function SourceStamp({
  id,
  source,
  sourceUrl,
  lastVerified,
  animate,
  compact,
  dateLabel,
}: {
  id: string;
  source: string;
  sourceUrl?: string | null;
  lastVerified?: string | null;
  animate?: boolean;
  compact?: boolean;
  dateLabel?: "added";
}) {
  const t = dict(await uiLang()).stamp;
  const label = dateLabel === "added" ? t.added : t.lastVerified;
  const verified = Boolean(lastVerified);
  const link = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null;
  if (compact) {
    // In lists the source is a quiet line under each record; the full stamp is kept for detail pages.
    return (
      <span className="meta-line" role="note" aria-label={t.source}>
        <span className="id">{id}</span>
        {verified ? (
          <span className="ok">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5 4.8 9 10 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {t.verified}
          </span>
        ) : <span className="warn">{t.notVerified}</span>}
        {verified ? <span>{label} {formatDate(lastVerified)}</span> : null}
        <span>{link ? <a href={link} rel="noopener">{source}</a> : source}</span>
      </span>
    );
  }
  return (
    <div className={`stamp ${animate ? "stamp-in" : ""}`} role="note" aria-label={t.source}>
      <div>
        {verified ? <strong>{t.verified}</strong> : <span style={{ color: "var(--caution)", fontWeight: 700 }}>{t.notVerified}</span>}
        {" "}{t.record} {id}
      </div>
      <div>{t.source}: {link ? <a href={link} rel="noopener">{source}</a> : source}</div>
      {verified ? <div>{t.approved}</div> : null}
      <div>{verified ? `${label} ${formatDate(lastVerified)}` : t.noDate}</div>
    </div>
  );
}
