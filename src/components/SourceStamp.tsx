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
    return (
      <span className="stamp stamp-compact" role="note" aria-label={t.source}>
        {verified ? <strong>{t.verified}</strong> : <span style={{ color: "var(--caution)", fontWeight: 700 }}>{t.notVerified}</span>}
        {" · "}{link ? <a href={link} rel="noopener">{source}</a> : source}
        {verified ? ` · ${label} ${formatDate(lastVerified)}` : ""}
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
      <div>{t.approved}</div>
      <div>{verified ? `${label} ${formatDate(lastVerified)}` : t.noDate}</div>
    </div>
  );
}
