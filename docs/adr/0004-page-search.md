# 0004. Page search with a result list and in-place highlights

## Status
Accepted (2026-10-06).

## Context
The owner wants a search bar at the top of the page, like the one on GitHub. The "/" key opens it. It must search all the text on the page. The site is one static page with about 15 KB of text and no server.

Constraints:

- No search library and no new dependency. The script budget stays small.
- Without JavaScript, no dead control may show.
- The query is the visitor's own input. It must never reach the URL, storage or the network.
- The search must be usable with a keyboard and a screen reader.

## Decision
1. **Index.** A small client module builds a list of text blocks from the DOM at start-up. There is no index file and no network request. The index covers the hero, the role cards (including text inside closed `<details>`), Skills, Languages, the footer and the stage headings. It skips the telemetry panel, the nav, the search controls, `aria-hidden` content and visually hidden helper text.
2. **Match.** The query needs at least 2 characters after trimming. The match is plain text, not a pattern. It ignores case and diacritics. A query such as `(` or `<b>` is only text.
3. **Result list.** One result for each section or card that holds a match, in page order, up to 8. Each result shows the name of the section or role and a snippet of 80 characters or fewer. If more sections match, the list ends with an "and N more" line.
4. **In-place highlights.** Every match is also highlighted on the page, with a counter and Next and Previous controls. The highlights use the CSS Custom Highlight API only, so the page DOM does not change. The active match differs from the others by more than colour. A match inside a closed `<details>` opens it, and clearing the search closes it again.
5. **Keys.** "/" focuses the input unless focus is already in a field, an editable element or a select, or Ctrl, Alt or Meta is held. The "/" character does not enter the input. The input is a combobox (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`). Escape clears the search.
6. **No HTML sink.** The module never writes HTML. It builds every node with `createElement` and `textContent`. A lint rule rejects `innerHTML`, `insertAdjacentHTML`, `document.write` and similar calls in `src/client`.
7. **Privacy.** The query never goes into the URL, `localStorage` or `sessionStorage`. The page sends no request while the visitor types.
8. **Progressive.** The search UI is added by the script. The prerendered HTML holds no search input or button. The labels reach the script through `data-*` attributes, so the client code holds no CV text.

## Consequences
Positive:

- No network, no new dependency and a small script. The page text and the telemetry stay as they were.
- Without JavaScript, no search box shows, so no control is dead.
- The highlights need no DOM change, so the search cannot break the page markup.

Negative:

- Two interaction models on one input (list keys and match keys) mean more keys and more tests.
- A browser without the Highlight API gets the result list but no in-place highlights.
- The index is built once at start-up. Text that changes later is not searched.

## Alternatives considered
A search library (extra weight for one small page), a result list only, and highlights only. The owner chose the list and the highlights together. They share one state and one index, so the second part adds little code.
