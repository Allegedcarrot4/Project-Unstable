// Root-level vite config for Stormkit.
// Stormkit runs `pnpm exec vite build` from the repo root — this config
// points vite at the actual app directory so all paths resolve correctly.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import javascriptObfuscator from "vite-plugin-javascript-obfuscator";
import { compression } from "vite-plugin-compression2";

const appDir = path.resolve(import.meta.dirname, "artifacts/app");
const isProd = process.env.NODE_ENV === "production";
const basePath = process.env.BASE_PATH || "/";

const epoxyDist = path.relative(
  appDir,
  path.resolve(appDir, "node_modules/@mercuryworkshop/epoxy-transport/dist")
).replace(/\\/g, "/");

export default defineConfig({
  base: basePath,
  root: appDir,
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [{ src: epoxyDist + "/index.mjs", dest: "epoxy" }],
    }),
    ...(isProd
      ? [
          javascriptObfuscator({
            include: [/\.js$/],
            exclude: [/node_modules/, /epoxy/, /libcurl/, /baremux/, /vanta/, /three/],
            options: {
              compact: true,
              controlFlowFlattening: true,
              controlFlowFlatteningThreshold: 0.75,
              deadCodeInjection: true,
              deadCodeInjectionThreshold: 0.4,
              debugProtection: true,
              disableConsoleOutput: true,
              identifierNamesGenerator: "hexadecimal",
              renameGlobals: false,
              rotateStringArray: true,
              selfDefending: true,
              shuffleStringArray: true,
              splitStrings: true,
              splitStringsChunkLength: 10,
              stringArray: true,
              stringArrayEncoding: ["base64"],
              stringArrayThreshold: 0.75,
              transformObjectKeys: true,
              unicodeEscapeSequence: false,
            },
          }),
          compression({ algorithm: "brotliCompress", exclude: [/\.(br|gz)$/] }),
          compression({ algorithm: "gzip", exclude: [/\.(br|gz)$/] }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(appDir, "src"),
      "@assets": path.resolve(appDir, "../../attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    outDir: path.resolve(appDir, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(appDir, "index.html"),
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three") || id.includes("node_modules/vanta")) return "vendor-3d";
          if (id.includes("node_modules/framer-motion")) return "vendor-motion";
          if (id.includes("node_modules/@supabase")) return "vendor-supabase";
          // React, Radix, and everything else stays in one vendor chunk
          // to avoid circular init ordering — splitting React out causes
          // "Cannot read properties of undefined (reading 'forwardRef')" crashes
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
