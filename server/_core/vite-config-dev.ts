// This file is only loaded in development mode and should never be bundled into production
// It re-exports the vite config for use in setupVite()

export async function loadViteConfig() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("loadViteConfig should only be called in development mode");
  }
  
  // Use require.resolve to avoid bundling vite.config
  // This ensures vite.config is only loaded at runtime in dev mode
  const viteConfigPath = require.resolve("../../vite.config.ts");
  delete require.cache[viteConfigPath];
  const config = require(viteConfigPath);
  return config.default;
}
