// Minimal vite config for production bundling
// This is used only when the full vite.config.ts cannot be imported
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  ssr: {
    external: ["@manus/sdk"],
  },
});
