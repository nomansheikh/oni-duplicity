import { defineConfig } from "vite-plus";

export default defineConfig({
  defaultPackage: {
    dev: "./apps/web",
    build: "./apps/web",
    preview: "./apps/web",
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    plugins: ["typescript", "oxc"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["apps/web/**"],
        plugins: ["react"],
        rules: {
          "react/rules-of-hooks": "error",
          "react/only-export-components": ["warn", { allowConstantExport: true }],
        },
      },
    ],
  },
  run: {
    cache: true,
    tasks: {
      fixtures: {
        command: "node scripts/fetch-fixtures.ts",
        cache: false,
      },
    },
  },
});
