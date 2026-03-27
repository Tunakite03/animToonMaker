import { defineConfig, globalIgnores } from "eslint/config";
import reactPlugin from "eslint-plugin-react";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  {
    plugins: { react: reactPlugin },
    settings: { react: { version: "detect" } },
  },
  globalIgnores([
    ".next/**",
    "dist/**",
    "src-tauri/**",
    "public/**",
  ]),
]);

export default eslintConfig;
