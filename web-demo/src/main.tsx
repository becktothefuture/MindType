import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import LMLab from "./lab/LMLab";
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
      {isDemos ? (
        <div style={{ padding: 16, color: '#e7e9ee', background: '#0b0f12', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h1 style={{ marginTop: 0 }}>Mind::Type — Demos</h1>
          <p style={{ opacity: 0.8 }}>All demos served by this dev server.</p>
          <ul style={{ lineHeight: 1.8 }}>
            <li><a href="/#/" style={{ color: '#7ce0b8' }}>Typing LM Demo (React)</a></li>
            <li><a href="/#/lab" style={{ color: '#7ce0b8' }}>LM Lab</a></li>
            <li><a href="/demo/band-swap/" style={{ color: '#7ce0b8' }}>Band‑Swap Demo</a></li>
            <li><a href="/demo/mt-braille-animation-v1/" style={{ color: '#7ce0b8' }}>Braille Animation v1</a></li>
            <li><a href="/demo/mt-scroll-anim-v1/" style={{ color: '#7ce0b8' }}>Scroll Anim v1</a></li>
          </ul>
        </div>
      ) : isLab ? <LMLab /> : <App />}
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
