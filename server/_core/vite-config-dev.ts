// This file is only loaded in development mode and should never be bundled into production
// It re-exports the vite config for use in setupVite()

export async function loadViteConfig() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("loadViteConfig should only be called in development mode");
  }
  
  // Dynamic import to ensure vite.config is not bundled
  const config = await import("../../vite.config");
  return config.default;
}
