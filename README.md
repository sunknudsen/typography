# Typography

Typography rules for user-facing copy, as a pure module and an ESLint plugin.

## Rules

- Straight double quotes become curly double quotes (“text”), a straight single quote becomes a right single curly quote (’) and three dots become an ellipsis (…).
- A comma before “and” or “or” in a sentence that already has a comma is dropped. This catches an Oxford comma (`A, B, and C`) and a comma joining clauses after a parenthetical alike, as no pattern can tell them apart… a sentence ends at a full stop, exclamation mark, question mark, colon or ellipsis followed by a space or at a spaced em dash. Parentheses are checked as sentences of their own.
- Inline code, URLs, HTML tags and markdown link targets are protected… their punctuation is machine-matched, not copy, so it is neither reported nor changed.

## Install

> Heads-up: Node 22.18 or newer is required to run the sources and tests… the published build runs on older releases. ESLint 9.10 or newer is needed for the plugin only.

```console
$ npm install --save-dev @sunknudsen/typography
```

## ESLint plugin

```js
import { configs } from "@sunknudsen/typography/eslint"

export default [
  ...configs.markdown,
  ...configs.json(["**/locales/**/*.json"]),
  ...configs.jsx,
]
```

`configs.markdown` checks the prose of every markdown file, skipping fenced code. `configs.json` checks every string value of the files matching the given patterns. `configs.jsx` checks JSX text and the string values of copy props such as `alt`, `label`, `placeholder` and `title` in `.ts` and `.tsx` files, skipping style props and HTML attributes that hold URLs, identifiers or enumerated values… it sets no parser, so configure a TypeScript parser for those files as usual. Every finding is a warning with a fix, so `eslint --fix` applies the rules.

## Pure module

```ts
import { findIssue, fixContent } from "@sunknudsen/typography"

const issue = findIssue(line)
if (issue !== null) {
  console.log(`${issue.message} (column ${issue.index + 1})`)
}
```

`findIssue` returns the earliest issue in the text, or `null`, with `index` and `length` locating it in the text as given and `messageId` naming the rule (`oxfordComma`, `straightDoubleQuote`, `straightEllipsis` or `straightSingleQuote`). `fixContent` returns the text with every rule applied outside protected regions. `fixAll` applies the rules to the whole text and `MESSAGES` maps each ID to its message. A linter that extracts prose itself, from markdown or anything else, calls `findIssue` on each line.

## Limits

A comma joining clauses after a parenthetical is reported like an Oxford comma. Dropping it would leave a run-on, so rewrite the sentence by hand… join the clauses with an ellipsis or a full stop instead. A comma whose list items are code spans is reported but not fixed for the same reason.

## Development

> Heads-up: `npm install` registers the git hook automatically unless scripts are ignored… running the `git config` command ensures it is registered.

```console
$ git config core.hooksPath .githooks
```

The hook runs the format check, typecheck, lint and tests before each commit. Source and tests are TypeScript that Node runs directly, so none of them needs a build.

## Release

> Heads-up: `prepublishOnly` runs every check and the build before publishing, but npm skips lifecycle scripts when `ignore-scripts` is set… on such a host, pass `--ignore-scripts=false` so `dist/` is fresh and checked. A scoped package is restricted by default on its first publish, so `publishConfig` in package.json sets access to public.

```console
$ npm version minor

$ npm publish --ignore-scripts=false
```
