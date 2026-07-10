import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

const CSP_PLACEHOLDER = "__HELP_THE_HIVE_CSP__";

const LOCAL_SUPABASE_CONNECT_SRC = [
  "http://127.0.0.1:54321",
  "http://localhost:54321",
  "ws://127.0.0.1:54321",
  "ws://localhost:54321",
];

const PRODUCTION_CONNECT_SRC = [
  "'self'",
  "https://*.supabase.co",
  "https://*.supabase.in",
  "wss://*.supabase.co",
  "wss://*.supabase.in",
  "https://nominatim.openstreetmap.org",
  "https://api.zippopotam.us",
  "https://world.openfoodfacts.org",
];

function createContentSecurityPolicy(mode: string) {
  const connectSrc =
    mode === "development"
      ? [
          "'self'",
          ...LOCAL_SUPABASE_CONNECT_SRC,
          ...PRODUCTION_CONNECT_SRC.filter((source) => source !== "'self'"),
        ]
      : PRODUCTION_CONNECT_SRC;

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["connect-src", connectSrc],
    [
      "img-src",
      [
        "'self'",
        "data:",
        "blob:",
        "https://*.supabase.co",
        "https://*.supabase.in",
        "https://images.unsplash.com",
        "https://images.openfoodfacts.org",
        "https://static.openfoodfacts.org",
        "https://helpthehive.com",
      ],
    ],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["font-src", ["'self'", "data:", "https:"]],
    ["script-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];

  return directives
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    {
      name: "help-the-hive-csp",
      transformIndexHtml(html) {
        if (!html.includes(CSP_PLACEHOLDER)) {
          throw new Error(`Missing ${CSP_PLACEHOLDER} in index.html`);
        }

        return html.replace(CSP_PLACEHOLDER, createContentSecurityPolicy(mode));
      },
    },
    mode === "development" && componentTagger(),
    process.env.ANALYZE === "true" &&
      visualizer({
        filename: "dist/bundle-stats.html",
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query"],
  },
  esbuild: {
    // Strip console.* and debugger statements from production bundles.
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
            "@radix-ui/react-accordion",
          ],
          "vendor-charts": ["recharts"],
          "vendor-motion": ["framer-motion"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
}));
