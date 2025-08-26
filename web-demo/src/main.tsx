import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { createCaretShim } from "./caretShim";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Attach caret monitor; keep side-effect minimal for demo
createCaretShim().then((shim) => {
  if (!shim) return;
  shim.onSnapshot((snaps) => {
    (window as any).__mtLastCaretSnaps = snaps;
  });
});

// Lazy-load background video source to avoid 404 if asset missing
const bg = document.getElementById('bg-video') as HTMLVideoElement | null;
if (bg) {
  const src = document.createElement('source');
  src.src = '/assets/background-video.webm';
  src.type = 'video/webm';
  bg.appendChild(src);
  bg.play().catch(() => {});
}
