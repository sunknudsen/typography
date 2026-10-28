// Typography rules. Detects and fixes punctuation in user-facing copy: a
// comma before “and” or “or” in a sentence that already has a comma is
// dropped (this catches the Oxford comma in “A, B, and C” and a comma joining
// clauses after a parenthetical alike, as no pattern can tell them apart…
// a sentence ends at “. ”, “! ”, “? ”, “: ”, “… ” or “ — ” and parentheses
// are sentences of their own), a straight single quote (') becomes a right
// single curly quote (’), straight double quotes ("text") become curly double
// quotes (“text”) and three dots (...) become an ellipsis (…). Inline code,
// URLs, HTML tags and markdown link targets are protected regions whose
// punctuation is machine-matched, not copy. This module has no imports, so a
// linter of any kind can call findIssue on the prose it extracts… eslint.ts
// wraps it as an ESLint plugin.

const RIGHT_SINGLE_QUOTE = "’"
const LEFT_DOUBLE_QUOTE = "“"
const RIGHT_DOUBLE_QUOTE = "”"
const ELLIPSIS = "…"

export type TypographyMessageId =
  | "oxfordComma"
  | "straightDoubleQuote"
  | "straightEllipsis"
  | "straightSingleQuote"

export interface TypographyIssue {
  index: number
  length: number
  message: string
  messageId: TypographyMessageId
}

export const MESSAGES: Record<TypographyMessageId, string> = {
  oxfordComma:
    "Drop comma before “and”/“or”… lists take none and clauses join with an ellipsis or a full stop.",
  straightDoubleQuote:
    'Use curly double quotes (“”) instead of straight double quotes (").',
  straightEllipsis: "Use ellipsis character (…) instead of three dots (...).",
  straightSingleQuote:
    "Use curly single quote (’) instead of straight single quote (').",
}

interface Location {
  index: number
  length: number
}

// A sentence ends at a full stop, exclamation mark, question mark, colon or
// ellipsis followed by a space, or at a spaced em dash
const SENTENCE_BOUNDARIES = [". ", "! ", "? ", ": ", "… ", " — "]

// A comma before “and” or “or” (any case) followed by whitespace or the end
// of the text, so a conjunction at the end of a line is not missed
const commaConjunctionRegExp = /, (?:and|or)(?=\s|$)/gi

// Innermost parentheses, which are checked as sentences of their own
const parentheticalRegExp = /\([^()]*\)/g

const maskParentheticals = (text: string): string =>
  text.replace(parentheticalRegExp, (match) => " ".repeat(match.length))

// A comma before “and” or “or” that follows at least one more comma in the
// same sentence
const findCommaConjunctions = (text: string): Location[] => {
  const found: Location[] = []
  for (const match of text.matchAll(commaConjunctionRegExp)) {
    const index = match.index ?? 0
    const before = text.substring(0, index)
    const sentenceStart = Math.max(
      0,
      ...SENTENCE_BOUNDARIES.map((boundary) => before.lastIndexOf(boundary))
    )
    if (before.substring(sentenceStart).includes(",")) {
      found.push({ index: index, length: match[0].length })
    }
  }
  return found
}

// Earliest comma to drop, with parentheses checked on their own so a comma
// inside one never arms the rule outside it and the other way around
const findOxfordComma = (text: string): null | Location => {
  const found = findCommaConjunctions(maskParentheticals(text))
  for (const match of text.matchAll(parentheticalRegExp)) {
    const index = match.index ?? 0
    for (const inner of findCommaConjunctions(match[0].slice(1, -1))) {
      found.push({ index: index + 1 + inner.index, length: inner.length })
    }
  }
  found.sort((a, b) => a.index - b.index)
  return found[0] ?? null
}

const fixDoubleQuotes = (text: string): string =>
  text.replace(/"([^"]*?)"/g, `${LEFT_DOUBLE_QUOTE}$1${RIGHT_DOUBLE_QUOTE}`)

const fixEllipsis = (text: string): string => text.replace(/\.\.\./g, ELLIPSIS)

const fixOxfordComma = (text: string): string => {
  let result = text
  while (true) {
    const oxford = findOxfordComma(result)
    if (oxford === null) break
    result =
      result.substring(0, oxford.index) + result.substring(oxford.index + 1)
  }
  return result
}

const fixSingleQuotes = (text: string): string =>
  text.replace(/'/g, RIGHT_SINGLE_QUOTE)

export const fixAll = (text: string): string =>
  fixSingleQuotes(fixOxfordComma(fixEllipsis(fixDoubleQuotes(text))))

// Regions whose punctuation is machine-matched, not copy: inline code
// (backtick runs of any length, per CommonMark — a double-backtick span can
// itself contain a backtick), URLs, HTML tags and the target of a markdown
// link or image with its optional quoted title (the link text stays copy)
const protectedRegions =
  /(`+)(?:(?!\1)[\s\S])*?\1|https?:\/\/[^\s)]+|<[^>]+>|\]\([^)\s]+(?: +"[^"]*")?\)/g

// Replaces protected regions with spaces of the same length so an index into
// the result is an index into the text, and so a region never joins the prose
// around it into a false match such as three dots
const maskProtectedRegions = (text: string): string =>
  text.replace(protectedRegions, (match) => " ".repeat(match.length))

// Finds the earliest issue in the copy, or null when there is none. Index and
// length locate the issue in the text as given, protected regions included.
export const findIssue = (text: string): null | TypographyIssue => {
  const masked = maskProtectedRegions(text)
  const candidates: (Location & { messageId: TypographyMessageId })[] = []

  const oxford = findOxfordComma(masked)
  if (oxford !== null) {
    candidates.push({
      index: oxford.index,
      length: oxford.length,
      messageId: "oxfordComma",
    })
  }
  const doubleQuoteIndex = masked.indexOf('"')
  if (doubleQuoteIndex !== -1) {
    const closeIndex = masked.indexOf('"', doubleQuoteIndex + 1)
    candidates.push({
      index: doubleQuoteIndex,
      length: closeIndex !== -1 ? closeIndex - doubleQuoteIndex + 1 : 1,
      messageId: "straightDoubleQuote",
    })
  }
  const ellipsisIndex = masked.indexOf("...")
  if (ellipsisIndex !== -1) {
    candidates.push({
      index: ellipsisIndex,
      length: 3,
      messageId: "straightEllipsis",
    })
  }
  const singleQuoteIndex = masked.indexOf("'")
  if (singleQuoteIndex !== -1) {
    candidates.push({
      index: singleQuoteIndex,
      length: 1,
      messageId: "straightSingleQuote",
    })
  }

  candidates.sort((a, b) => a.index - b.index)
  const issue = candidates[0]
  if (issue === undefined) return null
  return {
    index: issue.index,
    length: issue.length,
    message: MESSAGES[issue.messageId],
    messageId: issue.messageId,
  }
}

// Applies fixes to the copy while leaving protected regions byte-identical —
// fixing the whole line would corrupt code spans and URLs. Each stretch of
// copy is fixed on its own, so a comma whose list items are code spans is
// reported by findIssue but left for a hand fix, as is a comma joining
// clauses, where dropping it would leave a run-on.
export const fixContent = (text: string): string => {
  let result = ""
  let lastIndex = 0
  for (const match of text.matchAll(protectedRegions)) {
    const index = match.index ?? 0
    result += fixAll(text.slice(lastIndex, index))
    result += match[0]
    lastIndex = index + match[0].length
  }
  return result + fixAll(text.slice(lastIndex))
}
