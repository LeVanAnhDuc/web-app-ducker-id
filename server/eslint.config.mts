import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginPrettier from "eslint-plugin-prettier";
import pluginPromise from "eslint-plugin-promise";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default tseslint.config(
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021
      },
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      prettier: pluginPrettier,
      promise: pluginPromise,
      "unused-imports": pluginUnusedImports
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      // Prettier integration
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto"
        }
      ],
      // TypeScript rules
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          args: "after-used",
          caughtErrors: "none"
        }
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      // General JavaScript rules
      "no-undef": "off",
      "no-unused-vars": "off",
      "prefer-const": "warn",
      "no-var": "error",
      "no-console": "warn",
      "spaced-comment": "error",
      "arrow-body-style": ["error", "as-needed"],
      // Import rules
      "unused-imports/no-unused-imports": "error",
      // Promise rules
      "promise/always-return": "warn",
      "promise/no-return-wrap": "warn",
      "promise/param-names": "warn",
      "promise/catch-or-return": "warn"
    }
  },
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "backup",
      "coverage",
      ".husky",
      ".doc",
      "*.json",
      "eslint.config.mts",
      ".eslintignore",
      ".prettierrc",
      ".prettierignore"
    ]
  }
);
