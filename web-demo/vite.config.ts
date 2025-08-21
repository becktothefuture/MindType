import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        v1: resolve(__dirname, 'v1/index.html'),
        v2: resolve(__dirname, 'v2/index.html'),
      },
    },
  },
});
