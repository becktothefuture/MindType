/*╔══════════════════════════════════════════════════════════╗
  ║  ░  MAIN  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Band-swap noise-cluster animation demo; Band-swap animation tokens
  • WHY  ▸ REQ-BAND-SWAP, CONTRACT-BAND-SWAP
  • HOW  ▸ See linked contracts and guides in docs
*/

// Minimal local version of the original band-swap script (subset)
const DEFAULTS = {
  waveWidth: 12,
  noiseIntensity: 0.7,
  noiseUpdateInterval: 100,
  showWaveIndicator: true,
  waveColor: '#ff6b6b',
  brailleBias: 0.6,
  charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()',
};

let config = { ...DEFAULTS };
let noiseTimer = null;
let noiseFrame = 0;

const textEl = document.querySelector('[data-mt]');

function start() {
  if (!textEl) return;
  if (noiseTimer) clearInterval(noiseTimer);
  noiseTimer = setInterval(() => {
    noiseFrame++;
    applyNoise();
  }, config.noiseUpdateInterval);
}

function applyNoise() {
  const text = textEl.textContent || '';
  const mid = Math.floor(text.length / 2);
  const start = Math.max(0, mid - Math.floor(config.waveWidth / 2));
  const end = Math.min(text.length, start + config.waveWidth);
  const before = text.slice(0, start);
  const band = text.slice(start, end);
  const after = text.slice(end);
  const noisy = band
    .split('')
    .map((ch, i) => {
      if (ch === ' ') return ch;
      const seed = noiseFrame * 9973 + i * 37;
      const r = seeded(seed);
      if (r < config.noiseIntensity) {
        if (seeded(seed + 13) < config.brailleBias) {
          const BRAILLE = ['⠁','⠂','⠃','⠄','⠅','⠆','⠇','⠈','⠉','⠊','⠋','⠌','⠍','⠎','⠏'];
          return BRAILLE[Math.floor(seeded(seed + 23) * BRAILLE.length)];
        }
        return config.charset[Math.floor(seeded(seed + 53) * config.charset.length)] || ch;
      }
      return ch;
    })
    .join('');
  textEl.textContent = before + noisy + after;
}

function seeded(x) {
  const t = Math.sin(x) * 10000;
  return t - Math.floor(t);
}

document.addEventListener('DOMContentLoaded', start);



