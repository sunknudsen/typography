# Claude Code instructions

Typography rules for user-facing copy, published to npm as `@sunknudsen/typography` and used by superbacked, superbacked-website and guides. `src/core.ts` is the pure module and `src/eslint.ts` wraps it as an ESLint plugin.

## Environment boundaries

- Edit files using Edit/Write tools so changes surface as reviewable diffs… never rewrite files via sed, node or perl scripts.
- Verify changes using `npm run format:check`, `npm run typecheck`, `npm run lint` and `npm test`, in that order, against the whole repository… each finishes in seconds. Never `npm run format`, which rewrites unrelated drift.
- Never run `npm install`, `npm update`, `npm publish` or `npx` in this container… `node_modules` is host-owned and the user publishes from the host.
- `npm run build` emits `dist/`, which is ignored by git… run it to check the build, never commit its output.

## Tooling

- Source and tests are TypeScript that Node 22.18 or newer runs directly… no build step for tests or lint, erasable syntax only. Imports between source files use `.ts` extensions, which `tsc` rewrites to `.js` when building `dist/`.
- `src/core.ts` has no imports and stays that way, so a linter of any kind can use it. Type-only imports in `src/eslint.ts` use `import type` or inline `type`, as Node strips types without eliding unused imports.
- Only dependencies are the dev dependencies in `package.json`, with `eslint` as an optional peer… do not add more. The user updates them on the host.
- Every behaviour change is pinned in `tests/` before it ships… `tests/core.test.ts` for the rules, `tests/eslint.test.ts` for the processors and rule wiring.
- Git hooks live in `.githooks` and are registered with `git config core.hooksPath .githooks`, no husky or other hook managers… npm’s `prepare` script does this on install, but not when scripts are ignored, so the README documents the command.
- Comments open with a label sentence (“Typography rules.”) followed by full sentences. Inline comments are either one sentence without a full stop (clauses separated with “…”) or several sentences with full stops.

## Typography

- Prose, user-facing copy, code comments and console messages use curly quotes (“ ” ’), an ellipsis (…) and an em dash (—) to separate clauses or add explanation… straight quotes (`'` and `"`) and three dots (`...`) belong inside code only.
- Avoid a comma before “and” or “or” unless clarity needs it… the linter flags one when the sentence already has a comma, which catches an Oxford comma and a comma joining clauses after a parenthetical alike (a sentence ends at “. ”, “! ”, “? ”, “: ”, “… ” or “ — ” and parentheses count as sentences of their own).
- Rules live in `src/core.ts`, which `npm run lint` runs on this repository’s markdown… comments and console messages are not linted, so follow the rules by hand there.

## Release

- Versions follow semver as consumers see it… a change that reports or fixes anything new is a minor version, a wording or documentation change is a patch, a changed export is a major.
- The user bumps the version and runs `npm publish` on the host… `prepublishOnly` runs every check and the build first, unless `ignore-scripts` is set, in which case `--ignore-scripts=false` restores it (see README).

## Working style

- Verify claims against source code or official documentation before asserting them, and say so when something could not be verified.
- Recommend, then wait for “go” before applying changes the user asked about as a question.
- Git is handled by the user on the host… never run git write commands.
