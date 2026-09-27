import { formatDate } from "@/lib/format";

/**
 * The source stamp: the one element allowed to be loud. Every public record carries it so a
 * reader always sees where a record came from, that the data owner approved it, and when it
 * was last confirmed. `compact` is the one-line form for list rows.
 */
export function SourceStamp({
  id,
  source,
  sourceUrl,
  lastVerified,
  animate,
  compact,
  dateLabel = "Last verified",
}: {
  id: string;
  source: string;
  sourceUrl?: string | null;
  lastVerified?: string | null;
  animate?: boolean;
  compact?: boolean;
  dateLabel?: string;
}) {
  const verified = Boolean(lastVerified);
  const link = sourceUrl && /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null;
  if (compact) {
    return (
      <span className="stamp stamp-compact" role="note" aria-label="Source of this record">
        {verified ? <strong>Verified</strong> : <span style={{ color: "var(--caution)", fontWeight: 700 }}>Not yet verified</span>}
        {" · "}{link ? <a href={link} rel="noopener">{source}</a> : source}
        {verified ? ` · ${dateLabel} ${formatDate(lastVerified)}` : ""}
      </span>
    );
  }
  return (
    <div className={`stamp ${animate ? "stamp-in" : ""}`} role="note" aria-label="Source of this record">
      <div>
        {verified ? <strong>Verified</strong> : <span style={{ color: "var(--caution)", fontWeight: 700 }}>Not yet verified</span>}
        {" "}record {id}
      </div>
      <div>Source: {link ? <a href={link} rel="noopener">{source}</a> : source}</div>
      <div>Approved for publication by the LGA data owner</div>
      <div>{verified ? `${dateLabel} ${formatDate(lastVerified)}` : "No verification date on file"}</div>
    </div>
  );
}
