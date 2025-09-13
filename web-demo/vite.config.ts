import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import pkg from "../package.json" with { type: "json" };
import fs from "fs";
import { join } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    // Inject dev-time middleware via plugin hook (Vite 5/7 compatible)
    {
      name: 'mt-assets-alias',
      configureServer(server: import('vite').ViteDevServer) {
        const ASSETS_ROOT = resolve(__dirname, "..", "assets");
        const MODELS = join(ASSETS_ROOT, "models");
        const WASM = join(ASSETS_ROOT, "wasm");
        const PUBLIC_DIR = resolve(__dirname, "public");
        
        server.middlewares.use((req: any, res: any, next: () => void) => {
          const url = req?.url || "";
          
          // Serve static demo HTML files directly (bypass SPA routing)
          if (url.startsWith("/demo/") && (url.endsWith("/") || url.includes(".html"))) {
            const demoPath = url.endsWith("/") ? url + "index.html" : url;
            const filePath = join(PUBLIC_DIR, demoPath);
            if (fs.existsSync(filePath)) {
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              fs.createReadStream(filePath).pipe(res);
              return;
            }
          }
          
          const serve = (baseDir: string, prefix: string) => {
            const rel = url.slice(prefix.length);
            const filePath = join(baseDir, rel);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = filePath.split(".").pop() || "";
              const m: Record<string, string> = {
                json: "application/json",
                wasm: "application/wasm",
                onnx: "application/octet-stream",
                txt: "text/plain; charset=utf-8",
                html: "text/html; charset=utf-8",
                css: "text/css; charset=utf-8",
                js: "application/javascript; charset=utf-8",
              };
              res.setHeader("Content-Type", m[ext] || "application/octet-stream");
              fs.createReadStream(filePath).pipe(res);
              return true;
            }
            return false;
          };
          if (typeof url === 'string' && url.startsWith("/models/") && serve(MODELS, "/models/")) return;
          if (typeof url === 'string' && url.startsWith("/wasm/") && serve(WASM, "/wasm/")) return;
          next();
        });
      },
    } as PluginOption,
    // Public directory serves /demo/* and /_shared/* now; custom mount removed
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    fs: {
      allow: [
        // project root and bindings dir for WASM package
        resolve(__dirname),
        resolve(__dirname, ".."),
        resolve(__dirname, "..", ".."),
        "/Users/alexanderbeck/Coding Folder /MindType",
        "/Users/alexanderbeck/Coding Folder /MindType/bindings/wasm/pkg",
      ],
    },
    // Dev server defaults; asset/demo aliasing handled in plugins above
    middlewareMode: false,
    proxy: {},
    open: '/#/demos',
  },
  // Configure SPA fallback to not interfere with static demo routes
  appType: 'spa',
  publicDir: 'public',
  worker: {
    format: 'es',
    plugins: [react()],
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
});
