import js from "@eslint/js";
import globals from "globals";

/**
 * Flat ESLint config for PaperHub.
 *
 * Page scripts are native ES modules (`type="module"`, explicit imports from
 * ./utils.js). Only the two intentionally-classic IIFE bundles
 * (profile.js, tailwind-setup.js — self-contained, zero imports) keep the
 * lenient shared-global treatment.
 */
export default [
  {
    ignores: [
      "node_modules/**",
      "public/assets/css/**", // generated/vendored CSS, not source
      "coverage/**",
    ],
  },

  // Modern ESM page scripts: strict — typos and missing imports fail the build.
  {
    files: ["public/assets/js/**/*.js"],
    ignores: ["public/assets/js/profile.js", "public/assets/js/tailwind-setup.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Unused catch params are idiomatic here (best-effort cleanup paths).
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      eqeqeq: ["warn", "smart"],
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },

  // Intentionally-classic IIFE bundles (self-contained, no imports/exports).
  {
    files: ["public/assets/js/profile.js", "public/assets/js/tailwind-setup.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Encapsulated legacy bundles: cross-file references are not used here,
      // but keep the lenient globals treatment for their window mirrors.
      "no-undef": "off",
      "no-unused-vars": "off",
      eqeqeq: ["warn", "smart"],
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },

  // Modern ESM frontend modules (Plan B Phase 1 strangler).
  // Strict on purpose: no-undef stays ON here so typos are caught; new code
  // must import explicitly instead of relying on shared globals.
  {
    files: ["public/assets/js/esm/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      eqeqeq: ["warn", "smart"],
      "no-var": "warn",
      "prefer-const": "warn",
    },
  },

  // Node ESM (server + tests + ESM config files).
  {
    files: ["server/**/*.js", "tests/**/*.mjs", "eslint.config.js"],
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
