export class XYPad {
  constructor(container, id = 'xypad', label = 'Pad', defaults = { x: 0.6, y: 0.5 }) {
    this.id = id; // Store id as instance property
    this.wrap = document.createElement('div');
    this.wrap.className = 'pad-wrap';
    this.canvas = document.createElement('canvas');
    this.canvas.id = id;
    this.canvas.width = 160;
    this.canvas.height = 160;
    this.readouts = document.createElement('div');
    this.readouts.id = id + '-readouts';
    const title = document.createElement('div');
    title.className = 'pad-label';
    title.textContent = label;
    container.appendChild(this.wrap);
    this.wrap.appendChild(title);
    this.wrap.appendChild(this.canvas);
    this.wrap.appendChild(this.readouts);

    const saved = localStorage.getItem('ethereal_xy_' + id);
    this.x = defaults.x;
    this.y = defaults.y;
    if (saved) {
      try {
        const v = JSON.parse(saved);
        if (typeof v.x === 'number') this.x = Math.min(Math.max(v.x, 0), 1);
        if (typeof v.y === 'number') this.y = Math.min(Math.max(v.y, 0), 1);
      } catch {}
    }

    this.ctx = this.canvas.getContext('2d');
    this._drag = false;
    this._listeners = [];
    this._render();
    this._bind();
  }

  _bind() {
    const pick = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px =
        (('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left) / rect.width;
      const py =
        (('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top) / rect.height;
      this.x = Math.min(Math.max(px, 0), 1);
      this.y = Math.min(Math.max(py, 0), 1);
      this._render();
      this._emit();
      localStorage.setItem(
        'ethereal_xy_' + this.id,
        JSON.stringify({ x: this.x, y: this.y }),
      );
    };
    this.canvas.addEventListener('mousedown', (e) => {
      this._drag = true;
      pick(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (!this._drag) return;
      pick(e);
    });
    window.addEventListener('mouseup', () => {
      this._drag = false;
    });
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        this._drag = true;
        pick(e);
      },
      { passive: true },
    );
    window.addEventListener(
      'touchmove',
      (e) => {
        if (!this._drag) return;
        pick(e);
      },
      { passive: true },
    );
    window.addEventListener('touchend', () => {
      this._drag = false;
    });
  }

  _emit() {
    for (const cb of this._listeners) cb(this.x, this.y);
  }

  onChange(cb) {
    this._listeners.push(cb);
  }
  getX() {
    return this.x;
  }
  getY() {
    return this.y;
  }

  _render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background grid
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 8);
    ctx.lineTo(w / 2, h - 8);
    ctx.moveTo(8, h / 2);
    ctx.lineTo(w - 8, h / 2);
    ctx.stroke();

    // Dot
    const px = this.x * w;
    const py = this.y * h;
    ctx.fillStyle = 'rgba(90,200,250,0.9)';
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // Readouts
    this.readouts.textContent = `Density: ${this.x.toFixed(2)}  |  Energy: ${this.y.toFixed(2)}`;
  }
}
