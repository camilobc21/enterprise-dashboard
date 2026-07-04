// Production-safe vite config loader
// This file is only used in development and is never bundled for production

export async function loadViteConfig() {
  // Only load in development
  if (process.env.NODE_ENV !== "development") {
    throw new Error("loadViteConfig should only be called in development");
  }

  // Dynamically import the full vite config
  const viteConfigModule = await import("../../vite.config");
  return viteConfigModule.default;
}
