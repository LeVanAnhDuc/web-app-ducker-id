import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginNext from "@next/eslint-plugin-next";
import pluginTs from "@typescript-eslint/eslint-plugin";
import parserTs from "@typescript-eslint/parser";
import pluginPrettier from "eslint-plugin-prettier";
import pluginImport from "eslint-plugin-import";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginJsxA11y from "eslint-plugin-jsx-a11y";
import pluginPromise from "eslint-plugin-promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: pluginJs.configs.recommended
});

const eslintConfig = [
  ...compat.extends(
    "next",
    "next/core-web-vitals",
    "next/typescript",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "prettier"
  ),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        },
        project: "./tsconfig.json"
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "@typescript-eslint": pluginTs,
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "@next/next": pluginNext,
      prettier: pluginPrettier,
      import: pluginImport,
      "unused-imports": pluginUnusedImports,
      "jsx-a11y": pluginJsxA11y,
      promise: pluginPromise
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginTs.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...pluginNext.configs.recommended.rules,
      // Cấu hình không bắt lỗi type globals
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": "error",
      // ----------------------------
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto"
        }
      ], // Cảnh báo lỗi định dạng của prettier
      "@typescript-eslint/explicit-function-return-type": "off", // Tắt kiểm tra kiểu trả về của hàm
      "@typescript-eslint/no-explicit-any": "error", // Cấm sử dụng any
      "@typescript-eslint/ban-ts-comment": "warn", // Cảnh báo khi sử dụng @ts-ignore, @ts-expect-error, @ts-nocheck, @ts-check
      "react/react-in-jsx-scope": "off", // Không cần import React trong file JSX
      "react/prop-types": "off", // Tắt kiểm tra prop-types
      "prefer-const": "warn", // Sử dụng const thay vì let
      "no-var": "error", // Sử dụng const thay vì var
      "no-console": "warn", // Cảnh báo khi sử dụng console.log
      "spaced-comment": "error", // Đảm bảo có khoảng trắng sau dấu // trong comment
      "arrow-body-style": ["error", "as-needed"], // Sử dụng arrow function khi cần thiết
      "@typescript-eslint/consistent-type-imports": "error", // Sử dụng import type cho các import chỉ sử dụng kiểu
      "unused-imports/no-unused-imports": "error", // Xóa các import không sử dụng
      "jsx-a11y/alt-text": "warn", // Đảm bảo thẻ <img>, <area>, <input type="image"> có alt.
      "jsx-a11y/anchor-is-valid": "warn", // Đảm bảo thẻ <a> có href hoặc là một thẻ <Link>.
      "jsx-a11y/no-autofocus": "warn", // Tránh sử dụng thuộc tính autofocus trên các thẻ <input>, <select>, <textarea>.
      "promise/always-return": "warn", // Bắt buộc phải return trong mỗi nhánh của .then() để tránh "lost promise chain".
      "promise/no-return-wrap": "warn", // Tránh viết return Promise.resolve(Promise.resolve(...)).
      "promise/param-names": "warn", //	Đảm bảo bạn dùng đúng tên tham số (thường là resolve, reject) khi tạo Promise.
      "promise/catch-or-return": "warn", // Phải có .catch() hoặc return một promise để xử lý lỗi.
      "react-hooks/exhaustive-deps": "off" // Tắt kiểm tra dependency array của hooks
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      ".next",
      ".husky",
      "*.json",
      ".eslintignore",
      ".prettierrc",
      ".prettierignore",
      "next-env.d.ts"
    ]
  }
];

export default eslintConfig;
