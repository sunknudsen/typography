import assert from "node:assert"
import { suite, test } from "node:test"

import { Linter } from "eslint"

import plugin, { configs } from "../src/eslint.ts"

// The plugin is exercised through ESLint’s Linter so the processors run for
// real: markdown and JSON are turned into lines the content rule can see and
// messages and fixes are mapped back to the source.

const linter = new Linter()

const jsxConfig = [
  {
    files: ["**/*.jsx"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      typography: plugin,
    },
    rules: {
      "typography/typography": "warn" as const,
    },
  },
]

suite("eslint", () => {
  test("reports and fixes markdown prose, leaving code alone", () => {
    const markdown = [
      "# Title",
      "",
      'Run `"x"` to get "x"... and it\'s done',
      "",
      "```",
      'code "stays" as is...',
      "```",
    ].join("\n")
    const messages = linter.verify(markdown, configs.markdown, "README.md")
    assert.deepStrictEqual(
      messages.map((message) => [message.line, message.messageId]),
      [[3, "straightDoubleQuote"]]
    )
    const result = linter.verifyAndFix(markdown, configs.markdown, "README.md")
    assert.strictEqual(
      result.output,
      [
        "# Title",
        "",
        'Run `"x"` to get “x”… and it’s done',
        "",
        "```",
        'code "stays" as is...',
        "```",
      ].join("\n")
    )
  })

  test("reports and fixes JSON string values", () => {
    const json = '{\n  "title": "It\'s ready...",\n  "path": "./a/b"\n}\n'
    const config = configs.json(["**/locales/**/*.json"])
    const messages = linter.verify(json, config, "locales/en.json")
    assert.deepStrictEqual(
      messages.map((message) => [message.line, message.messageId]),
      [[2, "straightSingleQuote"]]
    )
    const result = linter.verifyAndFix(json, config, "locales/en.json")
    assert.strictEqual(
      result.output,
      '{\n  "title": "It’s ready…",\n  "path": "./a/b"\n}\n'
    )
  })

  test("reports JSX text and copy props, skipping non-copy props", () => {
    const jsx = [
      'const a = <p title="It\'s here">A, B, and C</p>',
      'const b = <img alt="Photo" src="it\'s/fine.png" className="x" />',
    ].join("\n")
    const messages = linter.verify(jsx, jsxConfig, "page.jsx")
    assert.deepStrictEqual(
      messages.map((message) => [message.line, message.messageId]),
      [
        [1, "straightSingleQuote"],
        [1, "oxfordComma"],
      ]
    )
    const result = linter.verifyAndFix(jsx, jsxConfig, "page.jsx")
    assert.strictEqual(
      result.output,
      [
        'const a = <p title="It’s here">A, B and C</p>',
        'const b = <img alt="Photo" src="it\'s/fine.png" className="x" />',
      ].join("\n")
    )
  })
})
