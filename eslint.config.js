// eslint.config.js — ESLint v10+ flat config for entire monorepo

import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [

  // -------------------------------------------------------------
  // 1. Global ignores (applies to ALL packages & services)
  // -------------------------------------------------------------
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/build/**"
    ],
  },

  // -------------------------------------------------------------
  // 2. TypeScript linting for all workspace packages
  // -------------------------------------------------------------
  {
    files: ["**/src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },

  // -------------------------------------------------------------
  // 3. JavaScript linting (optional but recommended)
  // -------------------------------------------------------------
  {
    files: ["**/src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
];
