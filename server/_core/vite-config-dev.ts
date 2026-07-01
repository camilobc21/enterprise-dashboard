// This file is only loaded in development mode and should never be bundled into production
// It re-exports the vite config for use in setupVite()
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadViteConfig() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("loadViteConfig should only be called in development mode");
  }
  
  // Use require to load vite.config at runtime only
  // This ensures vite.config is not bundled into production
  try {
    const viteConfigPath = path.resolve(__dirname, "../../vite.config.ts");
    const resolvedPath = require.resolve(viteConfigPath);
    delete require.cache[resolvedPath];
    const config = require(resolvedPath);
    return config.default;
  } catch (error) {
    console.error("Failed to load vite config:", error);
    throw error;
  }
}
