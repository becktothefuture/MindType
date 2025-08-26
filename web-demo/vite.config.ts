import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import pkg from "../package.json" assert { type: "json" };

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
  },
  build: {
    rollupOptions: {
      input: {
        // Single-page demo build uses default index.html
      },
    },
  },
});
