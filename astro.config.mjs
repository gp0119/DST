import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  outDir: "./dist/client",
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});
