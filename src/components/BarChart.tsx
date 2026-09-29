/**
 * Server-rendered bar chart for monthly figures (no chart library, no client JavaScript).
 * Every bar carries a <title> with its exact value, and the same numbers are always shown in
 * a table next to the chart, so nothing is only visual.
 */
export function BarChart({
  data,
  format,
  label,
  height = 180,
}: {
  data: { label: string; value: number | null }[];
  format: (n: number) => string;
  label: string;
  height?: number;
}) {
  const W = 640;
  const padL = 64, padB = 26, padT = 10;
  const vals = data.map((d) => d.value ?? 0);
  const max = Math.max(...vals, 1);
  const nice = niceMax(max);
  const innerW = W - padL - 8;
  const innerH = height - padB - padT;
  const bw = innerW / Math.max(data.length, 1);
  const ticks = [0, nice / 2, nice];
  const every = Math.ceil(data.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="chart" role="img" aria-label={label}>
      {ticks.map((t) => {
        const y = padT + innerH - (t / nice) * innerH;
        return (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y} y2={y} className={t === 0 ? "axis" : "grid"} />
            <text x={padL - 8} y={y + 4} textAnchor="end">{short(t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const v = d.value ?? 0;
        const h = (v / nice) * innerH;
        const x = padL + i * bw + bw * 0.14;
        return (
          <g key={d.label}>
            {d.value == null ? (
              <rect x={x} y={padT} width={bw * 0.72} height={innerH} fill="transparent">
                <title>{`${d.label}: not published`}</title>
              </rect>
            ) : (
              <rect x={x} y={padT + innerH - h} width={bw * 0.72} height={Math.max(h, 0.5)} className={`bar${i === data.length - 1 ? " is-last" : ""}`}>
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
            )}
            {(i % every === 0 && data.length - 1 - i >= Math.ceil(every / 2)) || i === data.length - 1 ? (
              <text x={x + bw * 0.36} y={height - 8} textAnchor="middle">{d.label}</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function niceMax(n: number) {
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= n) return m * p;
  return 10 * p;
}

/** ₦ axis labels: 450M, 1.2B. */
export function short(n: number) {
  if (n >= 1e12) return `${+(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${+(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${+(n / 1e3).toFixed(0)}K`;
  return String(n);
}
