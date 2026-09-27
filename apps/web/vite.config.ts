import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  // Relative asset paths so the build works under a GitHub Pages subpath.
  base: "./",
  plugins: lazyPlugins(() => [react(), tailwindcss()]),
  worker: { format: "es" },
});
