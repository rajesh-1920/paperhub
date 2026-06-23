import js from "@eslint/js";
import globals from "globals";

/**
 * Flat ESLint config for PaperHub.
 *
 * The browser code is a set of classic <script> files that intentionally share
 * a single global namespace (utils.js defines helpers consumed by main.js,
 * file.js, review.js, ...). `no-undef` is therefore disabled for that layer to
 * avoid thousands of false positives on legitimate cross-file references; real
 * mistakes are caught by the test suite and editor type-checking instead.
 */
export default [
  {
    ignores: [
      "node_modules/**",
      "public/assets/css/**", // generated/vendored CSS, not source
      "coverage/**",
    ],
  },

  // Browser scripts (shared-global architecture).
  {
    files: ["public/assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Cross-file globals are intentional in this layer (see header comment),
      // so undefined/unused analysis produces false positives on the shared API.
      "no-undef": "off",
      "no-unused-vars": "off",
      eqeqeq: ["warn", "smart"],
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },

  // Node ESM (tests + ESM config files).
  {
    files: ["tests/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
    },
  },

  // CommonJS config files.
  {
    files: ["tailwind.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
  },
];
