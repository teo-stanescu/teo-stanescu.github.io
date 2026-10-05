# 0005. Left navigation list and Contents popover

## Status
Accepted (2026-10-06).

## Context
The owner wants links on the left side to each heading. The right side already holds the telemetry panel from 768 px. Below 1280 px there is no room for a left rail.

Constraints:

- The rail and any narrow-screen menu must never disagree about the page.
- Without JavaScript, every link must still work.
- Keyboard order must match the visual order.
- No overlap with the text column, the telemetry panel or the trajectory, and no horizontal scroll from 360 px to 2560 px.

## Decision
1. **One list.** The build prerenders one `<nav>` list with seven entries: Top, Stage 3, Stage 2, Stage 1, Stage 0, Skills and Contact. Each stage entry holds a nested list of its roles. Each role entry targets the heading of its card.
2. **Rail from 1280 px.** The container grows by 13 rem. The nav is a sticky rail in that space.
3. **Popover below 1280 px.** Under the `js` class, the same element opens as a native popover from a "Contents" button in the top bar. Escape closes it and returns focus to the button. Choosing a link closes it. The script removes the button and the popover role again when the viewport grows to 1280 px.
4. **Fallback.** Under `js` the in-flow list is hidden below 1280 px, so a late script causes no layout shift. A small inline script in the `<head>` removes the `js` class at load if the client module has not set `nav-ready`. The plain list then shows again, and the page is complete.
5. **Source order.** The nav comes before the hero in the DOM, so tab order follows the screen. The skip link jumps past it.
6. **Active entry.** One scroll scheduler decides the active section for the nav, the telemetry and the trajectory. The entry for the section on the viewport midline has `aria-current="location"`. Only that stage shows its role entries, and the others are out of the tab order. A hash that names a role selects that role in the nav and the telemetry.
7. **Click.** A click scrolls to the target, sets the URL hash and moves focus to the target heading, clear of the sticky bar. Under reduced motion the jump is instant.

## Consequences
Positive:

- One list, so the rail and the popover cannot disagree.
- Without JavaScript, the nav is a plain list of working links.
- One scheduler means one scroll listener and one place that decides the current section.

Negative:

- The container width is no longer one number from 1280 px.
- Screen reader users meet the nav before the hero.
- The head script and the client module must agree on the `nav-ready` class. A test covers a failed start.

## Alternatives considered
A separate narrow-screen menu with its own markup (two lists to keep in step), and a rail that shows only with JavaScript (a shift on load, and nothing without a script).
