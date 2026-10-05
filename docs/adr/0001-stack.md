# 0001. Stack: Vite, React and TypeScript, prerendered with no hydration

## Status
Accepted (2026-10-05).

## Context
This site is one static page that presents a CV. It has these requirements:

- All CV text lives in one typed file, `src/content.ts`. Components hold no CV text.
- The full content is readable with JavaScript off.
- Lighthouse scores of 95 or more on mobile for Performance, Accessibility, Best Practices and SEO.
- Static output with no backend. The host is GitHub Pages.
- The owner wants Vite, React and TypeScript. Astro with React islands was an acceptable alternative if it could be justified.

The page has two interactive features. A trajectory line follows the scroll position, and a telemetry panel shows the role that is in view. Neither feature needs component state. A role card expands its details with the native `<details>` element, which needs no script.

Four options were compared:

| Option | Result |
|---|---|
| Vite + React, client render | The HTML is empty until JavaScript runs. It fails the "readable without JavaScript" requirement. |
| Vite + React, prerender and hydrate | It works. It ships about 60 KB gzip of React to attach behaviour that needs about 1.5 KB of script. |
| Astro + React islands | It works well and prerenders by default. But no part of this page needs an island, so React would go unused and the project would carry a larger dependency tree for one page. |
| No framework, template strings | The smallest option. Template strings do not escape text or type-check props, and it leaves the stack the owner asked for. |

## Decision
Use Vite, React 19 and TypeScript, with React at build time only.

1. A small Vite plugin (`scripts/prerender-plugin.ts`) loads `src/entry-server.tsx` and calls `renderToString`.
2. The plugin writes the result into `index.html` during the build. The dev server runs the same plugin and the same function, so the dev page and the production HTML are identical.
3. The browser receives no React. A vanilla TypeScript module of about 1.5 KB gzip draws the trajectory and updates the telemetry panel. It reads its data from `data-*` attributes in the HTML.
4. A test on the built output fails if the JavaScript loaded on first visit exceeds 20 KB gzip.
5. The plugin looks for `public/cv.pdf` at build time. The hero shows the CV button only when the file exists, so the page never links to a missing download.

Versions at the time of writing: Vite 8, React 19, TypeScript 5.9, Node 22. TypeScript stays on 5.9 because typescript-eslint does not support later versions yet.

## Consequences
Positive:

- The page is complete HTML. It works with JavaScript off and when the script fails to load.
- React gives typed components and automatic escaping of text, at no cost in the browser.
- The dependency list stays short: React, Vite, TypeScript, and the lint and test tools.

Negative:

- The build contains a small plugin that this repository owns and tests, and that must be kept compatible with Vite upgrades.
- Client behaviour is plain DOM code, not React. A feature that needs React in the browser breaks the 20 KB budget and needs a new decision.
- Dev and build share one code path, but a hydration-style workflow (React state in the browser) is deliberately not available.

## Alternatives considered
The four options in the table above. Astro was the closest alternative. It would be the better choice if the site grew several pages or needed a real interactive component.
