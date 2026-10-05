# 0003. Content model: one typed file, with explicit markers for missing facts

## Status
Accepted (2026-10-05).

## Context
The site presents a CV. The owner updates it by editing one file. The site must not show a fact that the owner did not supply: no invented dates, numbers or results. Some facts are missing. For example, some roles have no stated outcome, and one end date is not confirmed.

A missing fact needs a visible note for the owner in the source. The same note must never appear on the public page, and an empty heading must not appear either.

Options:

| Option | Result |
|---|---|
| Markdown or JSON files with a loader | No type check without extra schema code, and more than one file to edit. |
| A CMS | A backend or a third-party service for one page. |
| One TypeScript module | Types check the shape at build time. One file to edit. |

## Decision
1. `src/content.ts` holds all CV text and all user interface labels ("Context", "Download CV (PDF)" and similar). Components hold no text.
2. `src/config.ts` holds the site URL and the GitHub URL, one constant each. Every link reads these constants.
3. A missing fact is a marker created with `todo("note")`, not a string:
   ```ts
   export type Todo = { readonly todo: string };
   export type Text = string | Todo;
   export const present = (t: Text | undefined): t is string =>
     typeof t === "string" && t.length > 0;
   ```
   The marker is a frozen object whose `toString`, `valueOf`, `toJSON` and `Symbol.toPrimitive` all throw. Any attempt to turn it into text (a template literal, `String()`, `join()`, an attribute, JSON) fails the build with the note in the error message.
4. Components show a `Text` field only after `present()`. A marker is therefore omitted from the output: no text, no empty element. React also does not accept a plain object as a child, so putting a marker straight into JSX is a type error.
5. Dates are year and month values, not text. Code formats them and computes durations at build time. A current role has the end value `"present"`. An unconfirmed end date is a marker, and the page shows the start date only.
6. Team size is a number only where the owner gave one. Other roles show a dash.
7. Telemetry values go into `data-*` attributes in the HTML. The browser script never imports `content.ts`, so source notes cannot reach the browser bundle.
8. Automated checks:
   - A lint script fails on letters in JSX text in a component file, and on letters in a prose attribute (`alt`, `title`, `aria-label`).
   - A test on the built output fails if the word "TODO" occurs in any HTML, CSS or JavaScript file.
   - A test on the built output fails if any text in `content.ts` is missing from the HTML.
   - `npm run todos` lists every open marker with its line number.

## Consequences
Positive:

- One file to edit. The type check catches a wrong shape before the build.
- A missing fact is visible in the source and absent on the page. The page has no empty sections.
- The owner can list all open items with `npm run todos` or one search for `todo(`.

Negative:

- Labels and CV text sit in the same file. This costs some separation, in exchange for one place to edit.
- Throwing on coercion makes a mistake fail loudly at build time. That is intended, but a new contributor may find the error surprising at first.
- Durations refresh only when the site builds. Between builds, a duration can be a few weeks old.

## Alternatives considered
Markdown or JSON with a loader, and a CMS, both in the table above. A plain `undefined` for a missing fact was also considered. It cannot carry a note for the owner, so it loses the main benefit of the marker.
