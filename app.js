/*
 * app.js — 介面：載入圖片、點選取色、顯示互補色
 * 依賴 color.js 提供的 ColorMath 和 i18n.js 提供的 I18n。
 */
(function () {
  'use strict';

  const CM = window.ColorMath;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const t = (key, params) => window.I18n.t(key, params);

  const canvas = $('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const stage = $('stage');
  const empty = $('empty');
  const marker = $('marker');
  const loupe = $('loupe');
  const loupeCanvas = $('loupe-canvas');
  const loupeCtx = loupeCanvas.getContext('2d');
  const loupeHex = $('loupe-hex');
  const fileInput = $('file');
  const sampleSize = $('sample-size');
  const statusEl = $('status');
  const app = $('app');
  const stageWrap = $('stage-wrap');
  const valuesEl = $('values');
  const chipsEl = $('chips');
  const wheelEl = $('wheel');
  const pairingEl = $('pairing');
  const pairingTitle = $('pairing-title');
  const achromaticNote = $('achromatic-note');
  const historyEl = $('history');
  const historyEmpty = $('history-empty');
  const toastEl = $('toast');
  const dropOverlay = $('drop-overlay');

  const MAX_PIXELS = 16_000_000; // iOS Safari 的 canvas 上限約 1,670 萬像素
  const LOUPE_SIZE = 132;        // 放大鏡 CSS 尺寸
  const LOUPE_CELLS = 11;        // 放大鏡顯示 11 × 11 像素
  const HISTORY_KEY = 'complement-picker:history';
  const HISTORY_MAX = 18;

  // 名稱、簡稱、說明放在 i18n.js 的 alg.<key>.name / short / desc
  const ALGORITHMS = [
    { key: 'hsl', fn: CM.complementHsl },
    { key: 'oklch', fn: CM.complementOklch },
    { key: 'invert', fn: CM.complementInvert },
    { key: 'ryb', fn: CM.complementRyb },
  ];

  const state = {
    hasImage: false,
    point: null,     // 取樣點在原圖上的像素座標 { x, y }
    color: null,     // 取樣的顏色 { r, g, b }
    selected: 'hsl', // 搭配預覽使用的演算法
    image: null,     // 目前圖片的資訊，用來在切換語言時重寫狀態列
    history: loadHistory(),
  };

  /* ================= 載入圖片 ================= */

  // labelKey：沒有檔名時（例如貼上的圖片）用來顯示的翻譯 key
  function loadFile(file, labelKey) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t('toast.notImage'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || 1024;
      const h = img.naturalHeight || 1024;
      showImage(img, w, h, labelKey ? { key: labelKey } : { name: file.name });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showToast(t('toast.unreadable'));
    };
    img.src = url;
  }

  function showImage(source, w, h, label) {
    let scale = 1;
    if (w * h > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (w * h));
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    state.hasImage = true;
    state.point = null;
    marker.hidden = true;
    empty.hidden = true;
    stage.hidden = false;

    state.image = { ...label, w, h, scaled: scale < 1 };
    renderStatus();
    fitCanvas();
  }

  function renderStatus() {
    const img = state.image;
    let text = t('status.none');
    if (img) {
      text = t('status.loaded', { label: img.key ? t(img.key) : img.name, w: img.w, h: img.h });
      if (img.scaled) text += t('status.scaled', { w: canvas.width, h: canvas.height });
    }
    statusEl.textContent = text;
    statusEl.title = img ? text : '';
  }

  // 依照圖片區的可用空間決定畫布的顯示尺寸（保持比例，整張圖一定看得到）
  function fitCanvas() {
    if (!state.hasImage) return;
    const cs = getComputedStyle(stageWrap);
    const availW = stageWrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const availH = stageWrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availW <= 0 || availH <= 0) return;
    const s = Math.min(availW / canvas.width, availH / canvas.height);
    canvas.style.width = `${Math.max(1, Math.floor(canvas.width * s))}px`;
    canvas.style.height = `${Math.max(1, Math.floor(canvas.height * s))}px`;
    // 小圖放大時保留像素邊界，方便看清楚每一格的顏色
    canvas.style.imageRendering = s > 1.5 ? 'pixelated' : 'auto';
  }

  new ResizeObserver(fitCanvas).observe(stageWrap);

  /* ================= 取色 ================= */

  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    return { x: clamp(x, 0, canvas.width - 1), y: clamp(y, 0, canvas.height - 1) };
  }

  // 取 size × size 範圍的平均色；透明像素依透明度加權，完全透明時回傳 null
  function sampleAt(x, y, size) {
    const half = Math.floor(size / 2);
    const x0 = Math.max(0, x - half);
    const y0 = Math.max(0, y - half);
    const x1 = Math.min(canvas.width - 1, x + half);
    const y1 = Math.min(canvas.height - 1, y + half);
    const { data } = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    let r = 0, g = 0, b = 0, a = 0;
    for (let i = 0; i < data.length; i += 4) {
      const w = data[i + 3];
      r += data[i] * w;
      g += data[i + 1] * w;
      b += data[i + 2] * w;
      a += w;
    }
    if (a === 0) return null;
    return { r: Math.round(r / a), g: Math.round(g / a), b: Math.round(b / a) };
  }

  function pickAt(p) {
    state.point = p;
    placeMarker(p);
    const rgb = sampleAt(p.x, p.y, Number(sampleSize.value));
    if (!rgb) {
      showToast(t('toast.transparent'));
      return;
    }
    state.color = rgb;
    render();
  }

  function placeMarker(p) {
    marker.style.left = `${((p.x + 0.5) / canvas.width) * 100}%`;
    marker.style.top = `${((p.y + 0.5) / canvas.height) * 100}%`;
    marker.hidden = false;
  }

  // 拖曳時每一格畫面最多取色一次
  let pendingPoint = null;
  let rafId = 0;
  function schedulePick(p) {
    pendingPoint = p;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (pendingPoint) pickAt(pendingPoint);
      pendingPoint = null;
    });
  }

  let dragging = false;

  canvas.addEventListener('pointerdown', (e) => {
    if (!state.hasImage || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    const p = canvasPoint(e);
    pickAt(p);
    updateLoupe(e, p);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!state.hasImage) return;
    const p = canvasPoint(e);
    if (dragging) schedulePick(p);
    if (dragging || e.pointerType === 'mouse') updateLoupe(e, p);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    commitHistory();
    if (e.pointerType !== 'mouse') hideLoupe();
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { if (!dragging) hideLoupe(); });

  // 鍵盤：方向鍵移動取色點，Shift 一次 10 像素
  let keyCommitTimer = 0;
  canvas.addEventListener('keydown', (e) => {
    if (!state.hasImage) return;
    const step = e.shiftKey ? 10 : 1;
    const p = state.point
      ? { ...state.point }
      : { x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2) };
    if (e.key === 'ArrowLeft') p.x -= step;
    else if (e.key === 'ArrowRight') p.x += step;
    else if (e.key === 'ArrowUp') p.y -= step;
    else if (e.key === 'ArrowDown') p.y += step;
    else if (e.key === 'Enter' || e.key === ' ') {
      if (!state.point) pickAt(p);
      commitHistory();
      e.preventDefault();
      return;
    } else return;
    e.preventDefault();
    p.x = clamp(p.x, 0, canvas.width - 1);
    p.y = clamp(p.y, 0, canvas.height - 1);
    pickAt(p);
    clearTimeout(keyCommitTimer);
    keyCommitTimer = setTimeout(commitHistory, 700);
  });

  sampleSize.addEventListener('change', () => {
    if (state.point) {
      pickAt(state.point);
      commitHistory();
    }
  });

  /* ================= 放大鏡 ================= */

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  loupeCanvas.width = LOUPE_SIZE * dpr;
  loupeCanvas.height = LOUPE_SIZE * dpr;

  function updateLoupe(e, p) {
    const n = LOUPE_CELLS;
    const cell = LOUPE_SIZE / n;
    const half = (n - 1) / 2;
    const lc = loupeCtx;

    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    lc.imageSmoothingEnabled = false;
    lc.fillStyle = '#808080';
    lc.fillRect(0, 0, LOUPE_SIZE, LOUPE_SIZE);

    // 只畫出落在圖片內的部分，邊緣以外保持灰色
    const sx = p.x - half, sy = p.y - half;
    const cx0 = Math.max(0, sx), cy0 = Math.max(0, sy);
    const cx1 = Math.min(canvas.width, sx + n), cy1 = Math.min(canvas.height, sy + n);
    if (cx1 > cx0 && cy1 > cy0) {
      lc.drawImage(canvas, cx0, cy0, cx1 - cx0, cy1 - cy0,
        (cx0 - sx) * cell, (cy0 - sy) * cell, (cx1 - cx0) * cell, (cy1 - cy0) * cell);
    }

    lc.strokeStyle = 'rgba(0, 0, 0, 0.18)';
    lc.lineWidth = 1 / dpr;
    lc.beginPath();
    for (let i = 1; i < n; i++) {
      lc.moveTo(i * cell, 0); lc.lineTo(i * cell, LOUPE_SIZE);
      lc.moveTo(0, i * cell); lc.lineTo(LOUPE_SIZE, i * cell);
    }
    lc.stroke();

    // 框出取樣範圍
    const s = Number(sampleSize.value);
    const o = (half - (s - 1) / 2) * cell;
    lc.lineWidth = 3;
    lc.strokeStyle = '#000';
    lc.strokeRect(o, o, s * cell, s * cell);
    lc.lineWidth = 1.5;
    lc.strokeStyle = '#fff';
    lc.strokeRect(o, o, s * cell, s * cell);

    const hovered = sampleAt(p.x, p.y, s);
    loupeHex.textContent = hovered ? CM.rgbToHex(hovered) : t('loupe.transparent');

    // 滑鼠：放在游標右下；觸控：放在手指上方，避免被手指擋住
    const W = LOUPE_SIZE + 6;
    const H = LOUPE_SIZE + 26;
    let left, top;
    if (e.pointerType === 'mouse') {
      left = e.clientX + 20;
      top = e.clientY + 20;
      if (left + W > window.innerWidth - 8) left = e.clientX - 20 - W;
      if (top + H > window.innerHeight - 8) top = e.clientY - 20 - H;
    } else {
      left = e.clientX - W / 2;
      top = e.clientY - H - 56;
      if (top < 8) top = e.clientY + 56;
    }
    left = clamp(left, 8, window.innerWidth - W - 8);
    loupe.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    loupe.hidden = false;
  }

  function hideLoupe() {
    loupe.hidden = true;
  }

  /* ================= 顯示結果 ================= */

  function render() {
    const rgb = state.color;
    app.dataset.hasColor = String(Boolean(rgb));
    if (!rgb) {
      pairingTitle.textContent = t('pairing.title');
      return;
    }

    const hex = CM.rgbToHex(rgb);
    const hsl = CM.rgbToHsl(rgb);
    const achromatic = CM.isAchromatic(rgb);

    $('picked-swatch').style.background = hex;
    const pickedHex = $('picked-hex');
    pickedHex.textContent = hex;
    pickedHex.dataset.copy = hex;
    pickedHex.setAttribute('aria-label', t('copy.aria', { hex }));

    renderValues(rgb, hex, hsl);
    achromaticNote.hidden = !achromatic;
    $('wheel-hint').hidden = achromatic;

    const comps = ALGORITHMS.map((a) => {
      const c = a.fn(rgb);
      const out = { r: c.r, g: c.g, b: c.b };
      return {
        ...a,
        name: t(`alg.${a.key}.name`),
        short: t(`alg.${a.key}.short`),
        desc: t(`alg.${a.key}.desc`),
        rgb: out,
        hex: CM.rgbToHex(out),
        hue: CM.rgbToHsl(out).h,
        clipped: Boolean(c.clipped),
      };
    });

    renderQuick(hex, comps);
    renderChips(comps, achromatic);
    renderWheel(hex, hsl, comps, achromatic);
    renderPairing(rgb, hex, comps.find((c) => c.key === state.selected));
  }

  function renderValues(rgb, hex, hsl) {
    const rows = [
      ['HEX', hex],
      ['RGB', CM.formatRgb(rgb)],
      ['HSL', CM.formatHsl(hsl)],
      ['OKLCH', CM.formatOklch(CM.rgbToOklch(rgb))],
    ];
    const nodes = [];
    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = value;
      btn.dataset.copy = value;
      btn.title = t('copy.title');
      dd.appendChild(btn);
      nodes.push(dt, dd);
    }
    if (state.point) {
      const dt = document.createElement('dt');
      dt.textContent = t('values.position');
      const dd = document.createElement('dd');
      dd.textContent = t('values.positionValue', { x: state.point.x, y: state.point.y });
      nodes.push(dt, dd);
    }
    valuesEl.replaceChildren(...nodes);
  }

  // 小螢幕圖片下方的迷你色條：取樣色 + 四個互補色
  function renderQuick(hex, comps) {
    $('quick').replaceChildren(...[hex, ...comps.map((c) => c.hex)].map((h) => {
      const s = document.createElement('span');
      s.style.background = h;
      return s;
    }));
  }

  function renderChips(comps, achromatic) {
    const nodes = comps.map((c) => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.dataset.active = String(c.key === state.selected);

      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'chip-swatch';
      swatch.style.background = c.hex;
      swatch.dataset.select = c.key;
      swatch.setAttribute('aria-pressed', String(c.key === state.selected));
      swatch.setAttribute('aria-label', t('chips.select', { name: c.name }));

      const label = document.createElement('div');
      label.className = 'chip-label';

      const name = document.createElement('span');
      name.className = 'chip-name';
      name.textContent = c.name;

      const code = document.createElement('button');
      code.type = 'button';
      code.className = 'chip-code';
      code.textContent = c.hex;
      code.dataset.copy = c.hex;
      code.title = t('copy.code');
      code.setAttribute('aria-label', t('copy.aria', { hex: c.hex }));

      const meta = document.createElement('span');
      meta.className = 'chip-meta';
      meta.textContent = achromatic ? t('chips.noHue') : t('chips.hue', { deg: Math.round(c.hue) % 360 });

      const desc = document.createElement('span');
      desc.className = 'chip-desc';
      desc.textContent = c.clipped ? c.desc + t('alg.clipped') : c.desc;

      const head = document.createElement('div');
      head.className = 'chip-head';
      head.append(name, meta);

      label.append(head, code, desc);
      label.title = desc.textContent; // 極小的螢幕上說明可能被截斷，滑過仍可看到全文
      chip.append(swatch, label);
      return chip;
    });
    chipsEl.replaceChildren(...nodes);
  }

  /* ---------- 色相環 ---------- */

  const NS = 'http://www.w3.org/2000/svg';
  const R_IN = 66, R_OUT = 88, R_DOT = 77, R_LABEL = 104;
  const f2 = (n) => n.toFixed(2);
  const polar = (r, deg) => {
    const t = (deg * Math.PI) / 180;
    return [r * Math.sin(t), -r * Math.cos(t)];
  };
  const svg = (tag, attrs, text) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
  };

  let wheelDynamic = null;

  function buildWheel() {
    const ring = svg('g', {});
    const step = 3;
    for (let d = 0; d < 360; d += step) {
      const [x1, y1] = polar(R_OUT, d);
      const [x2, y2] = polar(R_OUT, d + step);
      const [x3, y3] = polar(R_IN, d + step);
      const [x4, y4] = polar(R_IN, d);
      const col = `hsl(${d + step / 2}, 100%, 50%)`;
      ring.appendChild(svg('path', {
        d: `M${f2(x1)} ${f2(y1)}A${R_OUT} ${R_OUT} 0 0 1 ${f2(x2)} ${f2(y2)}L${f2(x3)} ${f2(y3)}A${R_IN} ${R_IN} 0 0 0 ${f2(x4)} ${f2(y4)}Z`,
        fill: col,
        stroke: col,
        'stroke-width': 0.6,
      }));
    }
    wheelDynamic = svg('g', {});
    wheelEl.append(ring, wheelDynamic);
  }

  // 標籤太靠近時把角度往兩邊推開，避免文字重疊
  function spreadLabels(labels, minGap) {
    labels.sort((a, b) => a.angle - b.angle);
    for (let iter = 0; iter < 40; iter++) {
      let moved = false;
      for (let i = 0; i < labels.length; i++) {
        const a = labels[i];
        const b = labels[(i + 1) % labels.length];
        if (a === b) continue;
        let gap = b.angle - a.angle;
        if (i === labels.length - 1) gap += 360;
        if (gap < minGap) {
          const push = (minGap - gap) / 2;
          a.angle -= push;
          b.angle += push;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  function renderWheel(hex, hsl, comps, achromatic) {
    if (!wheelDynamic) buildWheel();
    const nodes = [];

    if (achromatic) {
      nodes.push(svg('text', { class: 'wheel-center', 'text-anchor': 'middle', y: 4 }, '—'));
      nodes.push(svg('text', { class: 'wheel-center-sub', 'text-anchor': 'middle', y: 22 }, t('wheel.noHue')));
      wheelDynamic.replaceChildren(...nodes);
      return;
    }

    // 取樣點到正對面的虛線，中間留空給中央文字
    for (const deg of [hsl.h, hsl.h + 180]) {
      const [x1, y1] = polar(R_IN - 4, deg);
      const [x2, y2] = polar(36, deg);
      nodes.push(svg('line', { class: 'wheel-line', x1: f2(x1), y1: f2(y1), x2: f2(x2), y2: f2(y2) }));
    }

    // 色相相同（相差不到 2°）的演算法合併成一個點
    const groups = [];
    for (const c of comps) {
      const g = groups.find((x) => Math.abs(((x.hue - c.hue + 540) % 360) - 180) < 2);
      if (g) g.items.push(c);
      else groups.push({ hue: c.hue, items: [c] });
    }

    const labels = [{ angle: hsl.h, text: t('wheel.picked'), picked: true }];
    for (const g of groups) {
      const [x, y] = polar(R_DOT, g.hue);
      nodes.push(svg('circle', { class: 'wheel-dot', cx: f2(x), cy: f2(y), r: 6.5, fill: g.items[0].hex }));
      labels.push({ angle: g.hue, text: g.items.map((c) => c.short).join('=') });
    }
    const [sx, sy] = polar(R_DOT, hsl.h);
    nodes.push(svg('circle', { class: 'wheel-dot-picked', cx: f2(sx), cy: f2(sy), r: 9.5, fill: hex }));

    spreadLabels(labels, 16);
    for (const l of labels) {
      const [x, y] = polar(R_LABEL, l.angle);
      const anchor = x > 12 ? 'start' : x < -12 ? 'end' : 'middle';
      nodes.push(svg('text', {
        class: l.picked ? 'wheel-label wheel-label-picked' : 'wheel-label',
        x: f2(x),
        y: f2(y + 4),
        'text-anchor': anchor,
      }, l.text));
    }

    nodes.push(svg('text', { class: 'wheel-center', 'text-anchor': 'middle', y: 6 }, `${Math.round(hsl.h) % 360}°`));
    nodes.push(svg('text', { class: 'wheel-center-sub', 'text-anchor': 'middle', y: 22 }, t('wheel.pickedHue')));
    wheelDynamic.replaceChildren(...nodes);
  }

  /* ---------- 搭配預覽 ---------- */

  function contrastVerdict(ratio) {
    if (ratio >= 7) return t('contrast.aaa');
    if (ratio >= 4.5) return t('contrast.aa');
    if (ratio >= 3) return t('contrast.large');
    return t('contrast.low');
  }

  function renderPairing(rgb, hex, comp) {
    pairingTitle.textContent = t('pairing.titleWith', { name: comp.name });
    const ratio = CM.contrastRatio(rgb, comp.rgb);

    const pair = document.createElement('div');
    pair.className = 'pair';
    const makeBlock = (bg, fg, caption) => {
      const fig = document.createElement('figure');
      const block = document.createElement('div');
      block.className = 'pair-block';
      block.style.background = bg;
      block.style.color = fg;
      block.textContent = t('pairing.sample');
      const cap = document.createElement('figcaption');
      cap.textContent = caption;
      fig.append(block, cap);
      return fig;
    };
    pair.append(
      makeBlock(hex, comp.hex, t('pairing.captionA')),
      makeBlock(comp.hex, hex, t('pairing.captionB')),
    );

    const p = document.createElement('p');
    p.className = 'contrast';
    const strong = document.createElement('strong');
    strong.textContent = t('contrast.ratio', { ratio: ratio.toFixed(2) });
    const verdict = document.createElement('span');
    verdict.textContent = contrastVerdict(ratio);
    p.append(strong, verdict);

    pairingEl.replaceChildren(pair, p);
  }

  /* ================= 取色紀錄 ================= */

  function loadHistory() {
    try {
      const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((h) => /^#[0-9A-F]{6}$/i.test(h)).slice(0, HISTORY_MAX) : [];
    } catch {
      return [];
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history));
    } catch {
      /* 無痕模式等情況下無法儲存，忽略即可 */
    }
  }

  function commitHistory() {
    if (!state.color) return;
    const hex = CM.rgbToHex(state.color);
    if (state.history[0] === hex) return;
    state.history = [hex, ...state.history.filter((h) => h !== hex)].slice(0, HISTORY_MAX);
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    historyEmpty.hidden = state.history.length > 0;
    $('clear-history').hidden = state.history.length === 0;
    historyEl.replaceChildren(...state.history.map((hex) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.background = hex;
      btn.dataset.restore = hex;
      btn.title = hex;
      btn.setAttribute('aria-label', t('history.restore', { hex }));
      li.appendChild(btn);
      return li;
    }));
  }

  $('clear-history').addEventListener('click', () => {
    state.history = [];
    saveHistory();
    renderHistory();
  });

  /* ================= 複製、選擇、提示 ================= */

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(t('toast.copied', { text }));
  }

  let toastTimer = 0;
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }

  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      copyText(copyBtn.dataset.copy);
      return;
    }
    const selectBtn = e.target.closest('[data-select]');
    if (selectBtn) {
      state.selected = selectBtn.dataset.select;
      render();
      chipsEl.querySelector(`[data-select="${state.selected}"]`)?.focus();
      return;
    }
    const restoreBtn = e.target.closest('[data-restore]');
    if (restoreBtn) {
      state.color = CM.hexToRgb(restoreBtn.dataset.restore);
      state.point = null;
      marker.hidden = true;
      render();
    }
  });

  /* ================= 選檔、拖放、貼上 ================= */

  fileInput.addEventListener('change', () => {
    loadFile(fileInput.files[0]);
    fileInput.value = '';
  });

  /* ================= 小螢幕的分頁 ================= */

  const tabButtons = Array.from(document.querySelectorAll('.tabs [role="tab"]'));

  function selectTab(key, focus) {
    app.dataset.tab = key;
    for (const btn of tabButtons) {
      const on = btn.dataset.tab === key;
      btn.setAttribute('aria-selected', String(on));
      btn.tabIndex = on ? 0 : -1;
      if (on && focus) btn.focus();
    }
  }

  for (const btn of tabButtons) {
    btn.addEventListener('click', () => selectTab(btn.dataset.tab));
    btn.addEventListener('keydown', (e) => {
      const i = tabButtons.indexOf(btn);
      let next = -1;
      if (e.key === 'ArrowRight') next = (i + 1) % tabButtons.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + tabButtons.length) % tabButtons.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabButtons.length - 1;
      if (next < 0) return;
      e.preventDefault();
      selectTab(tabButtons[next].dataset.tab, true);
    });
  }

  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
  let dragDepth = 0;

  window.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    dragDepth++;
    dropOverlay.hidden = false;
  });
  window.addEventListener('dragleave', (e) => {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dropOverlay.hidden = true;
  });
  window.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    dropOverlay.hidden = true;
    loadFile(e.dataTransfer.files[0]);
  });

  window.addEventListener('paste', (e) => {
    const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    e.preventDefault();
    loadFile(item.getAsFile(), 'status.pasted');
  });

  /* ================= 語言 ================= */

  const langSelect = $('lang');

  function syncLang(code) {
    const info = window.I18n.info(code);
    langSelect.value = info.code;
    $('lang-long').textContent = info.label;
    $('lang-short').textContent = info.short;
    // 切換語言時重新產生所有由程式寫入的文字
    renderStatus();
    render();
    renderHistory();
  }

  langSelect.addEventListener('change', () => window.I18n.setLang(langSelect.value, true));
  window.I18n.onChange(syncLang);

  /* ================= 啟動 ================= */

  selectTab(app.dataset.tab);
  syncLang(window.I18n.lang);
})();
