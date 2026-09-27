/** The AskLGA mark: a 3x3 block of LGA dots with one lit, the same unit as the national map. */
export function Mark({ size = 22 }: { size?: number }) {
  const c = [2, 9, 16];
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" focusable="false">
      <rect width="22" height="22" rx="4" fill="var(--band)" />
      {c.flatMap((y) => c.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" fill={x === 16 && y === 2 ? "#5fd08f" : "#3f6a55"} />))}
    </svg>
  );
}
