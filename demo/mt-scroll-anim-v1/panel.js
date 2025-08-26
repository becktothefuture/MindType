/*╔══════════════════════════════════════════════════════╗
  ║  ░  M T  S C R O L L  A N I M  V 1  P A N E L  ░░░░  ║
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
  • WHAT ▸ Sticky parameters panel with live bindings
  • WHY  ▸ Adjust animation behavior at runtime and persist
  • HOW  ▸ Native inputs; debounce; onChange emits config patches
*/

const FIELDS = [
  {
    key: 'unit',
    type: 'select',
    label: 'Reveal unit',
    options: ['line', 'word', 'char'],
  },
  {
    key: 'fontDesktop',
    type: 'number',
    label: 'Desktop font size (px)',
    min: 40,
    max: 300,
    step: 2,
  },
  {
    key: 'fontMobile',
    type: 'number',
    label: 'Mobile font size (px)',
    min: 24,
    max: 160,
    step: 2,
  },
  { key: 'wave', type: 'number', label: 'Active window size', min: 1, max: 20, step: 1 },
  {
    key: 'scatter',
    type: 'number',
    label: 'Scatter within window',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'randomness',
    type: 'number',
    label: 'Settle jitter',
    min: 0,
    max: 1,
    step: 0.05,
  },
  { key: 'fps', type: 'number', label: 'Scramble FPS', min: 10, max: 120, step: 1 },
  {
    key: 'settleMs',
    type: 'number',
    label: 'Min scramble time (ms)',
    min: 30,
    max: 1000,
    step: 10,
  },
  {
    key: 'lineEnterPercent',
    type: 'number',
    label: 'Line enter threshold (% from bottom)',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    key: 'lineExitTopPercent',
    type: 'number',
    label: 'Line exit start (% from top)',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    key: 'minExitOpacity',
    type: 'number',
    label: 'Min exit opacity',
    min: 0.2,
    max: 1,
    step: 0.05,
  },
  { key: 'blurPx', type: 'number', label: 'Exit blur (px)', min: 0, max: 20, step: 1 },
  {
    key: 'scaleMax',
    type: 'number',
    label: 'Exit scale max',
    min: 1,
    max: 1.2,
    step: 0.01,
  },
  { key: 'yUp', type: 'number', label: 'Exit lift (px)', min: 0, max: 100, step: 1 },
  { key: 'triggerOnce', type: 'checkbox', label: 'Trigger once' },
  {
    key: 'brailleBias',
    type: 'number',
    label: 'Builder glyph frequency',
    min: 0,
    max: 1,
    step: 0.05,
  },
  { key: 'colorFinal', type: 'color', label: 'Active text color (settled)' },
  {
    key: 'activeOpacity',
    type: 'number',
    label: 'Active opacity',
    min: 0.2,
    max: 1,
    step: 0.05,
  },
  {
    key: 'activeJitter',
    type: 'number',
    label: 'Active color jitter',
    min: 0,
    max: 0.3,
    step: 0.01,
  },
  {
    key: 'activeHueOscDeg',
    type: 'number',
    label: 'Hue oscillation (±deg)',
    min: 0,
    max: 60,
    step: 1,
  },
];

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') el.className = attrs[k];
    else if (k === 'for') el.htmlFor = attrs[k];
    else if (k === 'value') el.value = attrs[k];
    else el.setAttribute(k, attrs[k]);
  }
  for (const c of children) el.append(c);
  return el;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function mountPanel(container, config, onChange) {
  container.innerHTML = '';
  container.append(h('h3', {}, ['Parameters']));

  // Presets
  const presets = buildPresets(config);
  const presetsWrap = h('div', { class: 'mt-section' }, [
    h('div', { class: 'mt-title' }, ['Presets']),
    h('div', { class: 'mt-desc' }, ['Quickly apply common configurations.']),
    h(
      'div',
      { class: 'mt-presets' },
      presets.map((p) => presetButton(p, onChange, container)),
    ),
  ]);
  container.append(presetsWrap);

  // Sections: Targeting, Timing/Randomness, Line thresholds, Appearance
  container.append(
    section(
      'Targeting',
      'Choose how to split and size the text.',
      ['unit', 'fontDesktop', 'fontMobile'],
      config,
      onChange,
    ),
    section(
      'Timing & Dynamics',
      'Control window size, fps and minimum scramble duration.',
      ['wave', 'fps', 'settleMs'],
      config,
      onChange,
    ),
    section(
      'Line thresholds',
      'Where each line starts revealing and begins fading out.',
      ['lineEnterPercent', 'lineExitTopPercent', 'minExitOpacity'],
      config,
      onChange,
    ),
    section(
      'Appearance',
      'Use the swatches below for scramble hues A–D (weighted). Here, set only the active text color used when letters settle, plus opacity and gentle hue motion.',
      ['brailleBias', 'colorFinal', 'activeOpacity', 'activeJitter', 'activeHueOscDeg'],
      config,
      onChange,
    ),
  );

  container.append(
    h('div', { class: 'mt-note' }, ['Changes persist and apply live.']),
    resetControls(onChange),
  );

  // Color wheel tool for Active hues
  container.append(colorWheelSection(config, onChange));
}

function section(title, desc, keys, config, onChange) {
  const wrap = h('div', { class: 'mt-section' });
  wrap.append(
    h('div', { class: 'mt-title' }, [title]),
    h('div', { class: 'mt-desc' }, [desc]),
  );
  const fieldsWrap = h('div', { class: 'mt-fields' });
  keys.forEach((k) =>
    fieldsWrap.append(
      fieldToNode(
        config,
        onChange,
        FIELDS.find((f) => f.key === k),
      ),
    ),
  );
  wrap.append(fieldsWrap);
  return wrap;
}

function presetButton(preset, onChange, container) {
  const btn = h('button', {}, [preset.name]);
  btn.addEventListener('click', () => {
    // Emit all fields in preset
    onChange(preset.values);
    // Update UI inputs to reflect new values
    for (const [k, v] of Object.entries(preset.values)) {
      const input = container.querySelector(`#mt-${k}`);
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = !!v;
      else input.value = String(v);
    }
  });
  return btn;
}

function buildPresets(config) {
  return [
    // Technical (blue/cyan accents, white base)
    {
      name: 'Technical',
      values: {
        colorActive1: '#FFFFFF',
        colorActive2: '#0F62FE',
        colorActive3: '#12F7FF',
        colorActive4: '#A7F3FF',
        activeOpacity: 0.75,
        activeJitter: 0.06,
        activeHueOscDeg: 12,
      },
    },
    // Human (warm coral/peach accents)
    {
      name: 'Human',
      values: {
        colorActive1: '#F5F5F5',
        colorActive2: '#FF6A6A',
        colorActive3: '#FFC0A8',
        colorActive4: '#FF2DAA',
        activeOpacity: 0.8,
        activeJitter: 0.08,
        activeHueOscDeg: 10,
      },
    },
    // Serious (slate/blue accents)
    {
      name: 'Serious',
      values: {
        colorActive1: '#E6E6E6',
        colorActive2: '#2E5AAC',
        colorActive3: '#4BB3FD',
        colorActive4: '#7DA0F8',
        activeOpacity: 0.7,
        activeJitter: 0.05,
        activeHueOscDeg: 8,
      },
    },
    // Corporate (cool neutrals, subtle teal)
    {
      name: 'Corporate',
      values: {
        colorActive1: '#F0F0F0',
        colorActive2: '#6B93FF',
        colorActive3: '#7CD1CF',
        colorActive4: '#8E9AAE',
        activeOpacity: 0.72,
        activeJitter: 0.04,
        activeHueOscDeg: 6,
      },
    },
    // IBM (IBM blue family)
    {
      name: 'IBM',
      values: {
        colorActive1: '#F4F4F4',
        colorActive2: '#0F62FE',
        colorActive3: '#0043CE',
        colorActive4: '#FF832B',
        activeOpacity: 0.78,
        activeJitter: 0.05,
        activeHueOscDeg: 10,
      },
    },
    // Innovation (neon aqua/green)
    {
      name: 'Innovation',
      values: {
        colorActive1: '#FFFFFF',
        colorActive2: '#00F0FF',
        colorActive3: '#3EFF9E',
        colorActive4: '#BAFF62',
        activeOpacity: 0.75,
        activeJitter: 0.1,
        activeHueOscDeg: 16,
      },
    },
    // AI (indigo/mint glow)
    {
      name: 'AI',
      values: {
        colorActive1: '#FAFAFA',
        colorActive2: '#6C5CE7',
        colorActive3: '#00FFC6',
        colorActive4: '#B388FF',
        activeOpacity: 0.78,
        activeJitter: 0.09,
        activeHueOscDeg: 18,
      },
    },
    // Magic (pink/violet/aurora)
    {
      name: 'Magic',
      values: {
        colorActive1: '#FFFFFF',
        colorActive2: '#FF2DAA',
        colorActive3: '#B388FF',
        colorActive4: '#6DFFB3',
        activeOpacity: 0.8,
        activeJitter: 0.12,
        activeHueOscDeg: 20,
      },
    },
    // Editorial (calm, monochrome leaning)
    {
      name: 'Editorial',
      values: {
        colorActive1: '#EDEDED',
        colorActive2: '#9AA4B2',
        colorActive3: '#B2AFFF',
        colorActive4: '#6B93FF',
        activeOpacity: 0.82,
        activeJitter: 0.04,
        activeHueOscDeg: 6,
      },
    },
    // Cyberpunk (neon pink/cyan/purple)
    {
      name: 'Cyberpunk',
      values: {
        colorActive1: '#F8F8F8',
        colorActive2: '#FF2DAA',
        colorActive3: '#00E5FF',
        colorActive4: '#C300FF',
        activeOpacity: 0.76,
        activeJitter: 0.12,
        activeHueOscDeg: 22,
      },
    },
  ];
}

function colorWheelSection(config, onChange) {
  const wrap = h('div', { class: 'mt-section' });
  wrap.append(
    h('div', { class: 'mt-title' }, ['Color picker']),
    h('div', { class: 'mt-desc' }, [
      'Use the system color wheel, then fine-tune saturation and lightness. Click a swatch to choose which hue to edit.',
    ]),
  );

  const keys = ['colorActive1', 'colorActive2', 'colorActive3', 'colorActive4'];
  const hues = [
    config.colorActive1,
    config.colorActive2,
    config.colorActive3,
    config.colorActive4,
  ];
  const selected = { idx: 0 };

  const swatches = h('div', { class: 'mt-swatches' });
  hues.forEach((hex, i) => {
    const sw = h('button', { class: 'mt-swatch', 'aria-selected': String(i === 0) });
    sw.style.background = hex;
    sw.addEventListener('click', () => {
      selected.idx = i;
      updateSelected(swatches, i);
    });
    swatches.append(sw);
  });

  // Simplified: three system color fields only
  const colorInputs = keys.map((key, i) => {
    const ci = h('input', {
      type: 'color',
      value: hues[i] || '#ff2daa',
      style:
        'width:100%;height:36px;border:none;background:none;padding:0;cursor:pointer;',
    });
    ci.addEventListener('input', () => {
      const patch = {};
      patch[key] = ci.value;
      onChange(patch);
      swatches.children[i].style.background = ci.value;
    });
    return ci;
  });

  const controls = h('div', { class: 'mt-colorpicker' }, [
    h('div', { class: 'mt-ctrl' }, [h('label', {}, ['Active hue A']), colorInputs[0]]),
    h('div', { class: 'mt-ctrl' }, [h('label', {}, ['Active hue B']), colorInputs[1]]),
    h('div', { class: 'mt-ctrl' }, [h('label', {}, ['Active hue C']), colorInputs[2]]),
    h('div', { class: 'mt-ctrl' }, [h('label', {}, ['Active hue D']), colorInputs[3]]),
  ]);

  wrap.append(swatches, controls);
  return wrap;
}

function updateSelected(swatches, idx) {
  for (let i = 0; i < swatches.children.length; i++)
    swatches.children[i].setAttribute('aria-selected', String(i === idx));
}

function positionMarkerFromHex(mk, hex) {
  try {
    const { h } = hexToHsl(hex);
    const rad = (h * Math.PI) / 180;
    mk.style.left = `${50 + 40 * Math.cos(rad)}%`;
    mk.style.top = `${50 + 40 * Math.sin(rad)}%`;
  } catch {}
}

function hslToHexDeg(h, s, l) {
  return hslToHex(h, s, l);
}

// Reuse helpers from core conversion logic (duplicated minimal versions)
function hexToHsl(hex) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const bigint = parseInt(
    v.length === 3
      ? v
          .split('')
          .map((c) => c + c)
          .join('')
      : v,
    16,
  );
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  return { r, g, b };
}

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function resetControls(onChange) {
  const bar = h('div', { class: 'mt-presets', style: 'margin-top:12px;' });
  const resetBtn = h('button', {}, ['Reset to defaults']);
  resetBtn.addEventListener('click', () => {
    // Emit full defaults reset. The caller persists to localStorage.
    onChange({ __reset: true });
    location.reload();
  });
  bar.append(resetBtn);
  return bar;
}

function fieldToNode(config, onChange, def) {
  const id = `mt-${def.key}`;
  const wrap = h('div', { class: 'group' });
  const label = h('label', { for: id }, [def.label]);
  let input;
  if (def.type === 'select') {
    input = h('select', { id });
    for (const opt of def.options) {
      const o = h('option', { value: String(opt) }, [String(opt)]);
      if (String(config[def.key]) === String(opt)) o.selected = true;
      input.append(o);
    }
  } else if (def.type === 'checkbox') {
    input = h('input', { id, type: 'checkbox' });
    input.checked = !!config[def.key];
  } else if (def.type === 'number' && def.min != null && def.max != null) {
    // Render slider + numeric input when limits exist
    const value = Number(config[def.key] ?? def.min);
    const range = h('input', {
      id: id + '-range',
      type: 'range',
      min: String(def.min),
      max: String(def.max),
      step: String(def.step ?? 1),
      value: String(value),
      'aria-labelledby': id,
    });
    const number = h('input', {
      id,
      type: 'number',
      min: String(def.min),
      max: String(def.max),
      step: String(def.step ?? 1),
      value: String(value),
    });
    const minmax = h('div', { class: 'mt-minmax' }, [String(def.min), String(def.max)]);
    const dual = h('div', { class: 'mt-dual' }, [range, number]);

    const deb = debounce(() => {
      const v = Number(number.value);
      const patch = {};
      patch[def.key] = v;
      onChange(patch);
    }, 100);
    const syncFromRange = () => {
      number.value = String(range.value);
      deb();
    };
    const syncFromNumber = () => {
      range.value = String(number.value);
      deb();
    };
    range.addEventListener('input', syncFromRange);
    number.addEventListener('input', syncFromNumber);
    wrap.append(label, dual, minmax);
    return wrap;
  } else {
    const attrs = { id, type: def.type || 'text' };
    if (def.min != null) attrs.min = String(def.min);
    if (def.max != null) attrs.max = String(def.max);
    if (def.step != null) attrs.step = String(def.step);
    input = h('input', attrs);
    input.value = String(config[def.key] ?? '');
  }

  const deb = debounce(() => {
    const patch = {};
    patch[def.key] = readValue(input, def);
    onChange(patch);
  }, 100);

  input.addEventListener('input', deb);
  input.addEventListener('change', deb);

  wrap.append(label, input);
  return wrap;
}

function readValue(input, def) {
  if (def.type === 'checkbox') return !!input.checked;
  if (def.type === 'number') return Number(input.value);
  if (def.type === 'select') return input.value;
  return input.value;
}
