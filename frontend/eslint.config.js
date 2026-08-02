import eslint from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "playwright-report/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      globals: {
        window: "readonly",
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
);
