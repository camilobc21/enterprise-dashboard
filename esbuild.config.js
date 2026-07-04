import esbuild from "esbuild";

const externalModules = [
  "vite",
  "vite.config",
  "@builder.io/vite-plugin-jsx-loc",
  "@tailwindcss/vite",
  "@vitejs/plugin-react",
  "vite-plugin-manus-runtime",
  "defineConfig",
];

esbuild
  .build({
    entryPoints: ["server/_core/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outdir: "dist",
    packages: "external",
    external: externalModules,
  })
  .catch(() => process.exit(1));
