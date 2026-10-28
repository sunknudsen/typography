// Lints this repository’s own markdown with the plugin it ships, straight
// from source… Node runs the TypeScript directly.

import { configs } from "./src/eslint.ts"

export default [
  ...configs.markdown,
  {
    ignores: ["dist/", "node_modules/"],
  },
]
