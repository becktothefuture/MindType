import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import pkg from "../package.json" with { type: "json" };
import fs from "fs";
import { join } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [react()],
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
    // Map repo-level assets to /models and /wasm without duplicating inside web-demo
    middlewareMode: false,
    proxy: {},
    // Simple custom middleware to serve /models and /wasm from repo assets/
    configureServer(server) {
      const ASSETS_ROOT = resolve(__dirname, "..", "assets");
      const MODELS = join(ASSETS_ROOT, "models");
      const WASM = join(ASSETS_ROOT, "wasm");
      server.middlewares.use((req, res, next) => {
        const url = req.url || "";
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
        if (url.startsWith("/models/") && serve(MODELS, "/models/")) return;
        if (url.startsWith("/wasm/") && serve(WASM, "/wasm/")) return;
        next();
      });
    },
  },
  build: {
    rollupOptions: {
      input: {
        // Single-page demo build uses default index.html
      },
    },
  },
});
