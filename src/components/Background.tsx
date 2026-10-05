import { AIRPORTS, RADIALS, RINGS, ROUTES, RUNWAYS, VIEW, WAYPOINTS } from "../motifs";

// Decorative air traffic control map. Hand-written line art, aria-hidden, no motion.
export function Background() {
  return (
    <svg
      className="atc-map"
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      preserveAspectRatio="xMidYMid slice"
    >
      <symbol id="plane" viewBox="0 0 24 24">
        <path d="M23 12 14 9 9 2H7l2 7H5L3 7H1l1 5-1 5h2l2-2h4l-2 7h2l5-7 9-3z" fill="currentColor" stroke="none" />
      </symbol>
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        {RINGS.flatMap((c) =>
          c.r.map((r) => <circle key={`${c.x}-${r}`} cx={c.x} cy={c.y} r={r} vectorEffect="non-scaling-stroke" />),
        )}
        <path d={RADIALS} vectorEffect="non-scaling-stroke" />
        <path d={ROUTES} strokeDasharray="10 8" vectorEffect="non-scaling-stroke" />
        <path d={RUNWAYS} strokeWidth="3" vectorEffect="non-scaling-stroke" />
        {WAYPOINTS.map((p) => (
          <path key={p.code} d={`M${p.x} ${p.y - 8}l8 14h-16z`} vectorEffect="non-scaling-stroke" />
        ))}
        {AIRPORTS.map((p) => (
          <circle key={p.code} cx={p.x} cy={p.y} r="6" vectorEffect="non-scaling-stroke" />
        ))}
      </g>
      <g fill="currentColor" stroke="none" fontFamily="ui-monospace, Menlo, monospace" fontSize="14" letterSpacing="2">
        {[...WAYPOINTS, ...AIRPORTS].map((p) => (
          <text key={p.code} x={p.x + 14} y={p.y + 5}>
            {p.code}
          </text>
        ))}
      </g>
    </svg>
  );
}
