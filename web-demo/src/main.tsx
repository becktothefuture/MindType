import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import LMLab from "./lab/LMLab";
import DemoShowcase from "./DemoShowcase.tsx";
import { createCaretShim } from "./caretShim";

function Root() {
  const [hash, setHash] = useState<string>(typeof window !== 'undefined' ? window.location.hash : '');
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '');
    window.addEventListener('hashchange', handler);
    // initialize on mount
    handler();
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  const isLab = hash === '#/lab';
  const isDemos = hash === '#/demos';
  return (
    <StrictMode>
      {isDemos ? <DemoShowcase /> : isLab ? <LMLab /> : <App />}
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);

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
