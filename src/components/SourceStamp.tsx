export function SourceStamp({
  id,
  source,
  sourceUrl,
  lastVerified,
  animate,
}: {
  id: string;
  source: string;
  sourceUrl?: string | null;
  lastVerified?: string | null;
  animate?: boolean;
}) {
  const verified = Boolean(lastVerified);
  return (
    <div className={`stamp ${animate ? "stamp-in" : ""}`} role="note" aria-label="Source of this record">
      <div>
        {verified ? <strong>Verified</strong> : <span style={{ color: "var(--caution)", fontWeight: 700 }}>Not yet verified</span>}
        {" "}record {id}
      </div>
      <div>Source: {sourceUrl ? <a href={sourceUrl}>{source}</a> : source}</div>
      <div>{verified ? `Last verified ${lastVerified}` : "No verification date on file"}</div>
    </div>
  );
}
