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
        server.middlewares.use((req: any, res: any, next: () => void) => {
          const url = req?.url || "";
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
    // Dev server defaults; asset aliasing handled in plugin above
    middlewareMode: false,
    proxy: {},
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
});
