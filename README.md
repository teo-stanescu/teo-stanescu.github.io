# Mission log: a personal CV site

A single static page that presents a career as a mission log. Each role is a card. A trajectory line follows the scroll position, and a telemetry panel shows the stage, role, years, team size and focus of the card in view.

- Built with Vite, React 19 and TypeScript. React runs at build time only. The browser gets prerendered HTML, one stylesheet and a script of about 1.5 KB gzip.
- The page is complete with JavaScript off and with reduced motion.
- All CV text lives in one typed file, `src/content.ts`.
- Hosted on GitHub Pages at <https://teo-stanescu.github.io/>.

The design decisions are in [`docs/adr/`](docs/adr/):

- [0001 Stack](docs/adr/0001-stack.md)
- [0002 Animation](docs/adr/0002-animation.md)
- [0003 Content model](docs/adr/0003-content-model.md)

## Setup

You need Node 22 (the version in `.nvmrc`).

```bash
nvm use
npm ci
npm run hooks:install      # do this first, before any commit
```

Then create the private-data list. It is a plain text file, one name or value per line:

```bash
mkdir -p .private
$EDITOR .private/denylist.txt
```

The `.private/` folder is git-ignored and must never be committed. The private-data check fails if this file is missing. See [Rules for private data](#rules-for-private-data).

Start the dev server with `npm run dev`.

## Edit the content

Edit only `src/content.ts`. It holds the CV text and every label on the page. Components contain no text.

When a fact is missing, write a marker instead of a guess:

```ts
outcome: todo("the owner has not given an outcome for this role"),
```

A `todo()` marker is omitted from the page: no text and no empty heading appear. The marker throws an error if code tries to turn it into a string, so a note can never leak into the output by accident. A test also fails the build if the word "TODO" appears in any built file.

List the open items with:

```bash
npm run todos
# or
grep -n "todo(" src/content.ts
```

Replace a marker with a plain string when you have the fact.

The site URL and GitHub URL are constants in `src/config.ts`. The social preview image is `public/og-card.png`. Regenerate it after a name or title change with `node scripts/make-og.mjs`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Dev server. It uses the same prerender plugin as the build. |
| `npm run build` | Production build into `dist/`. |
| `npm run preview` | Serves `dist/` on port 4173. |
| `npm run lint` | ESLint, plus a check that components contain no CV text. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | Unit tests (Vitest). |
| `npm run test:dist` | Tests on the built output in `dist/`: no "TODO", size budgets, no source maps, no external URLs, the CV link matches the file. Run `npm run build` first. |
| `npm run test:e2e` | Browser tests (Playwright, with axe accessibility checks) against `npm run preview`. |
| `npm run verify:ci` | Lint, typecheck, unit tests, build, dist tests, browser tests. CI runs this. |
| `npm run verify` | `verify:ci`, then the local-only tests and the private-data check. |
| `npm run check:private` | Scans tracked files and `dist/` for entries of `.private/denylist.txt`. |
| `npm run lighthouse` | Local Lighthouse run (see [Checks](#checks)). |
| `npm run todos` | Lists every `todo()` marker in `src/content.ts`. |
| `npm run hooks:install` | Points Git at `.githooks/`. |

`node scripts/make-og.mjs` regenerates the social preview image. It has no npm script.

## Checks

Before you push, run:

```bash
npm run verify
```

This runs every check, including the private-data check. The first run needs a browser for the end-to-end tests: `npx playwright install chromium`.

Lighthouse is not a dependency. `npm run lighthouse` builds the site, serves it, and runs `npx lighthouse@12.8.2` three times with the Chromium that Playwright installed. It reports the median score for each category and fails if any is below 95. It runs locally only, because scores on shared CI machines vary too much to be a reliable gate. CI checks the main causes of a low score instead: size budgets on the built output, accessibility checks, and the `js` class set before first paint.

The pre-commit hook runs lint, typecheck, unit tests and the private-data check on staged content. The commit-message hook requires a conventional subject such as `feat(scope): subject`.

## CV file

To offer a CV download, put the file at `public/cv.pdf`. The hero button appears automatically on the next build. Without the file, the build prints a warning and the page omits the button, so it never links to a missing download.

Open the PDF and read it, including its metadata (author, title, comments), before you commit it. The private-data check does not scan PDFs.

## Deploy

The site deploys to GitHub Pages from GitHub Actions. One-time setup:

1. Create a public repository named `teo-stanescu.github.io` under the `teo-stanescu` account.
2. Add it as a remote and push `main`.
3. In the repository, open Settings, then Pages. Set Source to "GitHub Actions".
4. In the same page, turn on "Enforce HTTPS".

On each push to `main` (or a manual run), `.github/workflows/deploy.yml`:

1. Checks out the repository with full history and installs Node from `.nvmrc`.
2. Runs `npm ci` and installs Chromium.
3. Runs `npm run verify:ci`: lint, typecheck, unit tests, build, dist tests, browser tests.
4. Checks that every commit subject is a conventional commit.
5. Uploads `dist/` and deploys it to Pages. If any step fails, nothing is deployed.

The workflow does not run the private-data check, because the list never leaves your machine.

After each deploy, open <https://teo-stanescu.github.io/> and confirm that the styles and the script loaded.

## Rules for private data

The repository is public. Client names and other private values must never appear in a tracked file, in `dist/`, or in a commit message. The check reads the list in `.private/denylist.txt`, which stays on your machine. A hash of the list in the repository would not protect it, so the list is never committed in any form.

- Edit only on a local clone, with the hooks installed. The pre-commit hook runs the check on staged content.
- Do not use the GitHub web editor, and never commit with `--no-verify`. Both skip the check, and the CI workflow cannot make up for it.
- The check does not read `public/cv.pdf` or the social preview image. Look at both yourself.

### If a private name is pushed

A pushed commit is public at once and stays in the Git history. Deleting the file in a new commit is not enough.

1. Stop. Do not push anything else.
2. Rewrite the history before anyone clones it, for example with `git filter-repo`, so that no commit contains the value.
3. Force-push the rewritten history.
4. If the repository may already have been cloned or forked, or if you are not sure, consider deleting the repository and creating it again from the clean local copy.
5. Rotate or change the value if you can (for example, a phone number).
6. Run `npm run verify`, then redeploy.
