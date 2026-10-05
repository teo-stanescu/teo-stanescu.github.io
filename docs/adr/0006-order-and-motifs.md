# 0006. Newest-first order and aerospace motifs

## Status
Accepted (2026-10-06). This replaces the order rule of ADR 0002.

## Context
The owner wants the timeline to start with the current role and end with education. The owner also wants light aerospace motifs: airplane icons, a flight path and an air traffic control map.

Constraints:

- The motifs stay quiet. They must not lower text contrast, add real data about the owner, or move under reduced motion.
- The HTML order and the screen order must be the same, so keyboard and reading order hold.
- No image file, no map library and no animation library.

## Decision
1. **Order.** The build sorts stages from Stage 3 to Stage 0. Inside a stage, the build sorts roles newest first by start date, and a role that runs to the present comes first. The content file keeps its own order. The sort lives in `orderedStages` and `sortRoles` in `src/model.ts`.
2. **Same order everywhere.** The HTML, the nav, the telemetry and the screen all use the sorted order. The trajectory line still grows with scroll, so it now reads as a trip back in time. The stage names stay.
3. **Map.** One hand-written inline SVG layer holds range rings, runway strokes, radial lines, route legs and waypoint labels. Its data is in `src/motifs.ts`. The only real labels are the airport codes LROP and EDDW. Every other code is an invented five-letter name. The layer is `aria-hidden`, has `pointer-events: none` and holds at most 10 percent opacity. It is hidden in forced-colors mode and in print.
4. **Planes.** One shared plane symbol is used six times: at the tip of the trajectory line, at four stage labels and in the hero. Each use is `aria-hidden`. No plane appears in the telemetry, the nav, the search UI or the body text.
5. **Motion.** The plane at the tip follows the scroll position through the same scheduler as the line. No timer moves it. Under `prefers-reduced-motion: reduce` it stays at the start of the line.

## Consequences
Positive:

- A reader sees the current role first.
- The motifs add no request and no dependency.

Negative:

- The page no longer reads as a climb from launch to orbit.
- The background map adds about 1 to 2 KB gzip to the HTML. A test caps the page size.
- The map is hand-drawn, so a change to it means editing path data.
