import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";
import javascriptObfuscator from "vite-plugin-javascript-obfuscator";
import { compression } from "vite-plugin-compression2";

const rawPort = process.env.PORT || "5173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

const isProd = process.env.NODE_ENV === "production";

const epoxyDist = path.relative(import.meta.dirname, path.resolve(import.meta.dirname, "node_modules", "@mercuryworkshop", "epoxy-transport", "dist")).replace(/\\/g, "/");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: epoxyDist + "/index.mjs", dest: "epoxy" },
      ],
    }),
    ...(isProd ? [javascriptObfuscator({
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
    // Pre-compress all JS/CSS/HTML/wasm assets at build time.
    // Fastify serves the .br/.gz sidecars directly, saving per-request CPU.
    compression({ algorithm: "brotliCompress", exclude: [/\.(br|gz)$/] }),
    compression({ algorithm: "gzip", exclude: [/\.(br|gz)$/] }),
    ] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Split chunks so the browser can cache vendor libs independently of app code.
        // A deploy only busts the chunks that actually changed.
        manualChunks(id) {
          // Heavy 3D / animation libs — rarely change, large, cache forever
          if (id.includes("node_modules/three") || id.includes("node_modules/vanta")) {
            return "vendor-3d";
          }
          // Framer Motion — medium-sized, changes with library updates only
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          // React runtime — almost never changes
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
          // Radix UI primitives + shadcn utils — UI component library
          if (id.includes("node_modules/@radix-ui") || id.includes("node_modules/class-variance-authority") || id.includes("node_modules/clsx") || id.includes("node_modules/tailwind-merge")) {
            return "vendor-ui";
          }
          // Supabase client
          if (id.includes("node_modules/@supabase")) {
            return "vendor-supabase";
          }
          // Everything else in node_modules goes into a general vendor chunk
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
      "/service": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/ham": {
        target: "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
      "/baremux": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/return": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
