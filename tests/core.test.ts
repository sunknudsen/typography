import assert from "node:assert"
import { suite, test } from "node:test"

import { findIssue, fixAll, fixContent } from "../src/core.ts"

// The comma rule is a heuristic, not grammar… a comma before “and” or “or”
// in a sentence that already has a comma. Its edges are pinned here: what
// ends a sentence, what parentheses scope, what the match ignores.

const messageId = (text: string): null | string => {
  const issue = findIssue(text)
  return issue === null ? null : issue.messageId
}

suite("core", () => {
  test("drops comma before and/or after an earlier comma", () => {
    assert.strictEqual(messageId("A, B, and C"), "oxfordComma")
    assert.strictEqual(messageId("Oranges, apples, or pears"), "oxfordComma")
    // A comma joining clauses after a parenthetical looks the same
    assert.strictEqual(
      messageId("Fetched one at a time, up to ten at once, and retried"),
      "oxfordComma"
    )
    // Code spans are masked, the commas between them are copy
    assert.strictEqual(messageId("Use `a`, `b`, and `c`"), "oxfordComma")
    assert.strictEqual(fixAll("A, B, and C"), "A, B and C")
  })

  test("allows comma before and/or with no earlier comma", () => {
    assert.strictEqual(messageId("Encrypt, restore and share"), null)
    assert.strictEqual(messageId("Quit Firefox, and start it again"), null)
    assert.strictEqual(messageId("First, second, but third"), null)
  })

  test("ends a sentence at punctuation followed by a space", () => {
    for (const boundary of [". ", "! ", "? ", ": ", "… ", " — "]) {
      assert.strictEqual(
        messageId(`Install it, then wait${boundary}quit Firefox, and check`),
        null,
        JSON.stringify(boundary)
      )
    }
    // A later sentence arms the rule on its own
    assert.strictEqual(
      messageId("Install it, then wait. Quit Firefox, restart, and check"),
      "oxfordComma"
    )
  })

  test("checks parentheses as sentences of their own", () => {
    assert.strictEqual(messageId("(a, b) and c, or d"), null)
    assert.strictEqual(messageId("Pick one (a, b, or c) now"), "oxfordComma")
    assert.strictEqual(
      fixAll("Pick one (a, b, or c) now"),
      "Pick one (a, b or c) now"
    )
  })

  test("matches any case and a conjunction ending the text", () => {
    assert.strictEqual(messageId("First, second, And third"), "oxfordComma")
    assert.strictEqual(messageId("First, second, and"), "oxfordComma")
    assert.strictEqual(messageId("First, second, and\nthird"), "oxfordComma")
  })

  test("locates issues in the text as given", () => {
    const text = "Run `it's` then it's done"
    const issue = findIssue(text)
    assert.notStrictEqual(issue, null)
    assert.strictEqual(issue?.messageId, "straightSingleQuote")
    assert.strictEqual(text.slice(issue?.index, (issue?.index ?? 0) + 1), "'")
    assert.strictEqual(issue?.index, 18)
    // Two dots either side of a code span are not three dots
    assert.strictEqual(messageId("Wait..`x`."), null)
    // Earliest issue wins, whatever its kind
    assert.strictEqual(
      messageId('Plain "quoted" text, A, and B'),
      "straightDoubleQuote"
    )
  })

  test("protects links, URLs, HTML and code when fixing", () => {
    const link = 'See [Firefox](https://www.firefox.com/ "Mozilla Firefox") now'
    assert.strictEqual(messageId(link), null)
    assert.strictEqual(fixContent(link), link)
    assert.strictEqual(
      fixContent('Run `"x"` to get "x"... it\'s fine'),
      'Run `"x"` to get “x”… it’s fine'
    )
  })
})
