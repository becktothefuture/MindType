/*╔══════════════════════════════════════════════════════╗
  ║  ░  V I T E   C O N F I G  ░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Vite configuration for web-lab-v0.6
  • WHY  ▸ Minimal dev server and bundling
  • HOW  ▸ Standard ESM config
*/

import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5174 },
});


