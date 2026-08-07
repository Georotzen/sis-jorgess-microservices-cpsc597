// eslint.config.js
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    ignores: ["node_modules/**", "dist/**"],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: process.cwd(),
        project: [
          "./tsconfig.json",
          "./services/*/tsconfig.json",
          "./packages/*/tsconfig.json",
        ],
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
