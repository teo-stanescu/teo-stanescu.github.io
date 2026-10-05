# 0002. Animation: SVG, CSS and IntersectionObserver, no animation library

## Status
Accepted (2026-10-05).

## Context
The page tells a career as a mission. A trajectory line travels down the page as the reader scrolls. A telemetry panel shows the stage, role, years, team size and focus of the card in view. On narrow screens the panel becomes a compact sticky bar.

Constraints:

- Motion is subtle and must not hurt reading.
- With `prefers-reduced-motion: reduce`, the page has no motion and all content stays visible.
- With JavaScript off, all content stays visible, and the page does not shift when a script starts.
- The telemetry must be correct for scroll, for keyboard focus and for a link to a section.
- The page loads fast on mobile. No 3D library.

Options:

| Option | Result |
|---|---|
| Animation library (for example GSAP or Motion) | Tens of KB for two effects that CSS and a few lines of script can do. |
| CSS scroll-driven animations (`animation-timeline: scroll()`) | No script for the line. But support was not complete in all target browsers at the time, so a script fallback is necessary anyway. Two code paths for one effect. |
| SVG, CSS and a small script | One code path. About 1.5 KB gzip including the telemetry. |

## Decision
1. **Trajectory.** One inline SVG path with `pathLength="1"` and `stroke-dasharray: 1`. A passive scroll listener schedules at most one `requestAnimationFrame` per frame. It sets the CSS variable `--progress` (scroll position divided by scrollable height) on the root. CSS sets `stroke-dashoffset: calc(1 - var(--progress))`.
2. **Active card.** An `IntersectionObserver` with the root margin `-50% 0px -50% 0px` reports the card that crosses the viewport midline. The script copies the card's `data-*` values into the telemetry panel.
3. **Keyboard and links.** A `focusin` listener makes the card that holds the focus active. On load and on `hashchange`, the card or stage named by the URL fragment becomes active.
4. **Safe default.** Without JavaScript, the CSS shows the line fully drawn, all content visible, and the telemetry panel as a static block. Two classes on `<html>` switch behaviour on:
   - `js` is set by a one-line inline script in the `<head>`, before first paint. The layout that depends on the script (a fixed panel or sticky bar) is therefore correct from the first frame, which avoids layout shift. If the client module fails to start, it removes the class and the static page returns.
   - `motion` is set by the client module only after a start with no error, and only if reduced motion is off. All motion rules require this class.
5. **Reduced motion, twice.** The client module keeps `motion` in step with a `prefers-reduced-motion` media-query listener, so a change in the system setting applies without a reload. A `prefers-reduced-motion: reduce` rule in CSS also disables the animations, as a second guard that works even if the script has not run.
6. **One element, two layouts.** The panel and the sticky bar are the same element. Only CSS changes, at 768 px. `scroll-padding-top` keeps focused controls and link targets clear of the bar.
7. **No live region.** The panel has no `aria-live`. An announcement on each scroll is noise for a screen reader user, and the cards hold the same facts in reading order.

## Consequences
Positive:

- No animation dependency. The motion code is small enough to read in one sitting.
- With reduced motion or with no script, the reader sees a complete, static page. This is the default state, not a special case.
- The telemetry follows scroll, keyboard focus and links.
- Scroll work happens at most once per frame, and the browser re-lays-out for one CSS variable only.

Negative:

- A small inline script sits in the `<head>`. It is one statement, but it is the one place where script blocks first paint.
- Three states (no script, script without motion, script with motion) need tests. The browser test suite covers each of them.
- The line effect and the telemetry are written by hand, so cross-browser edge cases are ours to maintain.

## Alternatives considered
An animation library and CSS scroll-driven animations, both in the table above. If scroll-driven animations become available in all target browsers, the trajectory script can go. The telemetry script stays.
