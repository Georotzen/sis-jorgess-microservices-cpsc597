import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  // Config files that don't need TypeScript project context
  {
    files: ["eslint.config.js", "prettier.config.js", "*.config.{js,ts}", "services/**/src/*.config.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
  },
  // Main source files that need TypeScript project context
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: ["node_modules/**", "dist/**", ".next/**", "**/*.config.js", "**/*.config.ts", "services/**/src/*.config.ts"],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: process.cwd(),
        project: [
          "./tsconfig.json",
          "./apps/*/tsconfig.json",
          "./services/*/tsconfig.json",
          "./packages/*/tsconfig.json",
        ],
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },

    plugins: {
      "@typescript-eslint": tseslint,
    },

    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
