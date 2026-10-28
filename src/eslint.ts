// ESLint plugin: typography. Enforces typographically correct punctuation in
// user-facing copy using the rules in core.ts. The typography rule checks JSX
// text nodes and string prop values, skipping import paths, string literals
// in logic and non-copy props (see shouldSkipProp). The typography-content
// rule checks content in JSON and markdown files through the processors
// below, which skip code blocks, inline code, HTML tags and URLs. The configs
// export wires each rule to its file type.

import { ESLint, Linter, type Rule } from "eslint"
import type { ExpressionStatement } from "estree"

import packageJson from "../package.json" with { type: "json" }
import { MESSAGES, findIssue, fixAll, fixContent } from "./core.ts"

// Mantine style props — always skip (from https://mantine.dev/styles/style-props/)
const MANTINE_STYLE_PROPS = new Set([
  "bd",
  "bg",
  "bga",
  "bgp",
  "bgr",
  "bgsz",
  "bottom",
  "c",
  "display",
  "ff",
  "flex",
  "fs",
  "fw",
  "fz",
  "h",
  "inset",
  "left",
  "lh",
  "lts",
  "m",
  "mah",
  "maw",
  "mb",
  "me",
  "mih",
  "miw",
  "ml",
  "mr",
  "ms",
  "mt",
  "mx",
  "my",
  "opacity",
  "p",
  "pb",
  "pe",
  "pl",
  "pos",
  "pr",
  "ps",
  "pt",
  "px",
  "py",
  "right",
  "ta",
  "td",
  "top",
  "tt",
  "w",
])

// HTML attributes that accept free-form user-visible text (from https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes)
// These are the ONLY standard HTML attributes where users enter prose — all others accept
// URLs, booleans, numbers, enumerated values, or technical identifiers.
const HTML_COPY_ATTRIBUTES = new Set(["alt", "label", "placeholder", "title"])

// All standard HTML attributes in React camelCase (from https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes)
// Used to identify "this is a known HTML attribute" so we can skip non-copy ones.
const HTML_ALL_ATTRIBUTES = new Set([
  "accept",
  "acceptCharset",
  "accessKey",
  "action",
  "align",
  "allow",
  "alpha",
  "alt",
  "as",
  "async",
  "autoCapitalize",
  "autoComplete",
  "autoPlay",
  "background",
  "bgColor",
  "border",
  "capture",
  "charSet",
  "checked",
  "cite",
  "className",
  "color",
  "colorSpace",
  "cols",
  "colSpan",
  "content",
  "contentEditable",
  "controls",
  "coords",
  "crossOrigin",
  "csp",
  "data",
  "dateTime",
  "decoding",
  "default",
  "defer",
  "dir",
  "dirName",
  "disabled",
  "download",
  "draggable",
  "elementTiming",
  "encType",
  "enterKeyHint",
  "fetchPriority",
  "form",
  "formAction",
  "formEncType",
  "formMethod",
  "formNoValidate",
  "formTarget",
  "headers",
  "height",
  "hidden",
  "high",
  "href",
  "hrefLang",
  "htmlFor",
  "httpEquiv",
  "id",
  "inputMode",
  "integrity",
  "isMap",
  "itemProp",
  "key",
  "kind",
  "label",
  "lang",
  "language",
  "list",
  "loading",
  "loop",
  "low",
  "max",
  "maxLength",
  "media",
  "method",
  "min",
  "minLength",
  "multiple",
  "muted",
  "name",
  "noValidate",
  "open",
  "optimum",
  "pattern",
  "ping",
  "placeholder",
  "playsInline",
  "poster",
  "preload",
  "property",
  "readOnly",
  "referrerPolicy",
  "rel",
  "required",
  "reversed",
  "role",
  "rows",
  "rowSpan",
  "sandbox",
  "scope",
  "selected",
  "shape",
  "size",
  "sizes",
  "slot",
  "span",
  "spellCheck",
  "src",
  "srcDoc",
  "srcLang",
  "srcSet",
  "start",
  "step",
  "style",
  "summary",
  "tabIndex",
  "target",
  "title",
  "translate",
  "type",
  "useMap",
  "value",
  "width",
  "wrap",
])

// Determine if a prop should be skipped
const shouldSkipProp = (propName: string): boolean => {
  // Always skip Mantine style props
  if (MANTINE_STYLE_PROPS.has(propName)) return true
  // Known HTML attribute — skip unless it accepts free-form text
  if (HTML_ALL_ATTRIBUTES.has(propName))
    return HTML_COPY_ATTRIBUTES.has(propName) === false
  // Custom prop (not HTML, not Mantine style) — check it
  return false
}

const typographyRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce typographic punctuation in JSX text and props",
    },
    fixable: "code",
    messages: MESSAGES,
    schema: [],
  },
  create(context) {
    return {
      JSXText(
        node: Rule.Node & {
          raw: string
          loc: { start: { line: number; column: number } }
        }
      ) {
        const raw = node.raw
        const issue = findIssue(raw)
        if (issue === null) return

        const startLine = node.loc.start.line
        const startCol = node.loc.start.column

        const locateInRaw = (
          index: number
        ): {
          line: number
          column: number
        } => {
          const before = raw.substring(0, index)
          const newlines = (before.match(/\n/g) ?? []).length
          const lastNewline = before.lastIndexOf("\n")
          return {
            line: startLine + newlines,
            column:
              lastNewline === -1 ? startCol + index : index - lastNewline - 1,
          }
        }

        const loc = locateInRaw(issue.index)
        context.report({
          loc: {
            start: loc,
            end: { line: loc.line, column: loc.column + issue.length },
          },
          messageId: issue.messageId,
          fix(fixer) {
            return fixer.replaceText(node, fixAll(raw))
          },
        })
      },

      JSXAttribute(
        node: Rule.Node & {
          name: { name: string }
          value: null | (Rule.Node & { value: string; raw: string })
        }
      ) {
        const propName = node.name.name
        if (shouldSkipProp(propName)) return
        if (node.value?.type !== "Literal") return
        if (typeof node.value?.value !== "string") return

        const raw = node.value.value
        const issue = findIssue(raw)
        if (issue === null) return

        context.report({
          node: node.value,
          messageId: issue.messageId,
          fix(fixer) {
            return fixer.replaceText(
              node.value as Rule.Node,
              `"${fixAll(raw).replace(/"/g, "&quot;")}"`
            )
          },
        })
      },
    }
  },
}

const typographyContentRule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce typographic punctuation in content (JSON and markdown)",
    },
    fixable: "code",
    messages: MESSAGES,
    schema: [],
  },
  create(context) {
    return {
      ExpressionStatement(
        node: ExpressionStatement & Rule.NodeParentExtension
      ) {
        if (
          node.expression.type !== "Literal" ||
          !("value" in node.expression) ||
          typeof node.expression.value !== "string"
        ) {
          return
        }

        const raw = node.expression.value
        const issue = findIssue(raw)
        if (issue === null) return

        context.report({
          node,
          messageId: issue.messageId,
          fix(fixer) {
            return fixer.replaceText(
              node,
              JSON.stringify(fixContent(raw)) + ";"
            )
          },
        })
      },
    }
  },
}

interface LineMapping {
  column: number
  endColumn: number
  line: number
  sourceLength: number
  sourceOffset: number
}

// Fenced code per CommonMark: a fence opens with three or more backticks or
// tildes (optionally inside a blockquote and indented up to three spaces) and
// closes with the same character, at least as many times, followed by nothing
// but spaces. A backtick fence cannot open when backticks follow it on the
// same line (that is inline code). A fence inside a blockquote ends with the
// blockquote, so the first line without “>” closes it and is checked normally.
const fenceRegExp = /^(> ?)? {0,3}(`{3,}|~{3,})(.*)$/
const closingFenceRegExp = /^(?:> ?)? {0,3}(`{3,}|~{3,}) *$/
const quotedRegExp = /^ {0,3}>/

let markdownLineMap: LineMapping[] = []

const markdownProcessor: Linter.Processor = {
  meta: {
    name: "markdown-content",
    version: packageJson.version,
  },
  supportsAutofix: true,
  preprocess(text) {
    const lines = text.split("\n")
    const jsLines: string[] = []
    markdownLineMap = []
    let fenceMarker: null | string = null
    let fenceQuoted = false
    let offset = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line === undefined) continue
      const lineOffset = offset
      offset += line.length + 1

      if (fenceMarker === null) {
        const opening = line.match(fenceRegExp)
        const marker = opening?.[2]
        const rest = opening?.[3]
        if (
          marker !== undefined &&
          rest !== undefined &&
          (marker.startsWith("`") && rest.includes("`")) === false
        ) {
          fenceMarker = marker
          fenceQuoted = opening?.[1] !== undefined
          continue
        }
      } else if (fenceQuoted && quotedRegExp.test(line) === false) {
        fenceMarker = null
      } else {
        const closing = line.match(closingFenceRegExp)?.[1] ?? ""
        if (
          closing.startsWith(fenceMarker[0] ?? "") &&
          closing.length >= fenceMarker.length
        ) {
          fenceMarker = null
        }
        continue
      }

      const issue = findIssue(line)
      if (issue === null) continue

      jsLines.push(JSON.stringify(line) + ";")
      markdownLineMap.push({
        column: issue.index + 1,
        endColumn: issue.index + issue.length + 1,
        line: i + 1,
        sourceLength: line.length,
        sourceOffset: lineOffset,
      })
    }

    return [
      {
        text: jsLines.join("\n") || "// no content to check",
        filename: "0.js",
      },
    ]
  },

  postprocess(messages) {
    return messages.flat().map((message) => {
      const mapping = markdownLineMap[message.line - 1]
      if (mapping === undefined) return message
      const result = {
        ...message,
        column: mapping.column,
        endColumn: mapping.endColumn,
        endLine: mapping.line,
        line: mapping.line,
      }
      if (result.fix !== undefined && result.fix !== null) {
        result.fix = {
          range: [
            mapping.sourceOffset,
            mapping.sourceOffset + mapping.sourceLength,
          ] as [number, number],
          text: JSON.parse(result.fix.text.replace(/;$/, "")),
        }
      }
      return result
    })
  },
}

let jsonLineMap: LineMapping[] = []

const jsonProcessor: Linter.Processor = {
  meta: {
    name: "json-content",
    version: packageJson.version,
  },
  supportsAutofix: true,
  preprocess(text) {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return [{ text: "// invalid JSON", filename: "0.js" }]
    }

    const jsLines: string[] = []
    jsonLineMap = []
    const lines = text.split("\n")
    const foundOffsets = new Set<number>()

    const findStringInSource = (value: string): LineMapping | null => {
      const escaped = JSON.stringify(value)
      let offset = 0
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line === undefined) continue
        let searchFrom = 0
        let col = line.indexOf(escaped, searchFrom)
        while (col !== -1) {
          const absoluteOffset = offset + col
          if (foundOffsets.has(absoluteOffset) === false) {
            foundOffsets.add(absoluteOffset)
            return {
              column: col + 1,
              endColumn: col + escaped.length + 1,
              line: i + 1,
              sourceLength: escaped.length,
              sourceOffset: absoluteOffset,
            }
          }
          searchFrom = col + 1
          col = line.indexOf(escaped, searchFrom)
        }
        offset += line.length + 1
      }
      return null
    }

    const walk = (obj: unknown): void => {
      if (typeof obj === "string") {
        if (findIssue(obj) !== null) {
          jsLines.push(JSON.stringify(obj) + ";")
          const loc = findStringInSource(obj)
          if (loc !== null) {
            jsonLineMap.push(loc)
          } else {
            jsonLineMap.push({
              column: 1,
              endColumn: 1,
              line: 1,
              sourceLength: 0,
              sourceOffset: 0,
            })
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach(walk)
      } else if (obj !== null && typeof obj === "object") {
        Object.values(obj).forEach(walk)
      }
    }

    walk(parsed)

    return [
      {
        text: jsLines.join("\n") || "// no content to check",
        filename: "0.js",
      },
    ]
  },

  postprocess(messages) {
    return messages.flat().map((message) => {
      const mapping = jsonLineMap[message.line - 1]
      if (mapping === undefined) return message
      const result = {
        ...message,
        column: mapping.column,
        endColumn: mapping.endColumn,
        endLine: mapping.line,
        line: mapping.line,
      }
      if (
        result.fix !== undefined &&
        result.fix !== null &&
        mapping.sourceLength > 0
      ) {
        const fixedValue = JSON.parse(result.fix.text.replace(/;$/, ""))
        result.fix = {
          range: [
            mapping.sourceOffset,
            mapping.sourceOffset + mapping.sourceLength,
          ] as [number, number],
          text: JSON.stringify(fixedValue),
        }
      }
      return result
    })
  },
}

const plugin: ESLint.Plugin = {
  meta: {
    name: packageJson.name,
    namespace: "typography",
    version: packageJson.version,
  },
  rules: {
    typography: typographyRule,
    "typography-content": typographyContentRule,
  },
  processors: {
    json: jsonProcessor,
    markdown: markdownProcessor,
  },
}

// Annotated so the emitted declarations import eslint only, rather than the
// transitive package its inferred types would point at
export const configs: {
  jsx: Linter.Config[]
  json: (patterns: string[]) => Linter.Config[]
  markdown: Linter.Config[]
} = {
  jsx: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      plugins: { typography: plugin },
      rules: { "typography/typography": "warn" as const },
    },
  ],
  json: (patterns: string[]) => [
    {
      files: patterns,
      plugins: { typography: plugin },
      processor: "typography/json" as const,
    },
    {
      files: patterns.map((p) => `${p}/*.js`),
      plugins: { typography: plugin },
      rules: { "typography/typography-content": "warn" as const },
    },
  ],
  markdown: [
    {
      files: ["**/*.md"],
      plugins: { typography: plugin },
      processor: "typography/markdown" as const,
    },
    {
      files: ["**/*.md/*.js"],
      plugins: { typography: plugin },
      rules: { "typography/typography-content": "warn" as const },
    },
  ],
}

export default plugin
