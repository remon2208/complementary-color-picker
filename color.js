/*
 * color.js — 互補色演算法
 * 沒有任何相依套件，可以在瀏覽器（全域變數 ColorMath）和 Node.js（require）裡使用。
 *
 * 顏色一律用 { r, g, b } 表示，數值 0–255。
 */
(function (root) {
  'use strict';

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const mod = (n, m) => ((n % m) + m) % m;
  const round = (v, digits = 0) => {
    const f = 10 ** digits;
    return Math.round(v * f) / f;
  };
  const roundRgb = ({ r, g, b }) => ({
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
  });

  /* ---------- HEX ---------- */

  function hexToRgb(hex) {
    let h = String(hex).trim().replace(/^#/, '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error('無效的 HEX 色碼：' + hex);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function rgbToHex(rgb) {
    const { r, g, b } = roundRgb(rgb);
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /* ---------- HSL ---------- */

  // RGB → HSL（h: 0–360，s、l: 0–100）
  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = mod((g - b) / d, 6);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }

  // HSL → RGB
  function hslToRgb({ h, s, l }) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = mod(h, 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r1 = 0, g1 = 0, b1 = 0;
    if (hp < 1) [r1, g1, b1] = [c, x, 0];
    else if (hp < 2) [r1, g1, b1] = [x, c, 0];
    else if (hp < 3) [r1, g1, b1] = [0, c, x];
    else if (hp < 4) [r1, g1, b1] = [0, x, c];
    else if (hp < 5) [r1, g1, b1] = [x, 0, c];
    else [r1, g1, b1] = [c, 0, x];
    const m = l - c / 2;
    return roundRgb({ r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 });
  }

  /* ---------- OKLab / OKLCH（Björn Ottosson, 2020） ---------- */

  const toLinear = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const fromLinear = (c) =>
    (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.sign(c) * Math.abs(c) ** (1 / 2.4) - 0.055) * 255;

  function rgbToOklab({ r, g, b }) {
    const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
    const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
    return {
      L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    };
  }

  // OKLab → 線性 sRGB（0–1，可能超出範圍）
  function oklabToLinear({ L, a, b }) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return {
      r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    };
  }

  const EPS = 1e-4;
  const inGamut = ({ r, g, b }) =>
    r >= -EPS && r <= 1 + EPS && g >= -EPS && g <= 1 + EPS && b >= -EPS && b <= 1 + EPS;

  function oklabToRgb(lab) {
    const lin = oklabToLinear(lab);
    return roundRgb({
      r: fromLinear(clamp(lin.r, 0, 1)),
      g: fromLinear(clamp(lin.g, 0, 1)),
      b: fromLinear(clamp(lin.b, 0, 1)),
    });
  }

  function rgbToOklch(rgb) {
    const { L, a, b } = rgbToOklab(rgb);
    const C = Math.hypot(a, b);
    const h = C < 1e-6 ? 0 : mod((Math.atan2(b, a) * 180) / Math.PI, 360);
    return { L, C, h };
  }

  /* ---------- 互補色演算法 ---------- */

  // 1. HSL 色相 +180°。
  //    等同於 RGB 捷徑：新值 = max + min − 原值（亮度、飽和度完全不變，而且是整數運算）
  function complementHsl({ r, g, b }) {
    const s = Math.max(r, g, b) + Math.min(r, g, b);
    return { r: s - r, g: s - g, b: s - b };
  }

  // 2. RGB 反相：255 − 原值。色相同樣轉 180°，但亮度會反過來（L → 100 − L）
  function complementInvert({ r, g, b }) {
    return { r: 255 - r, g: 255 - g, b: 255 - b };
  }

  // 3. OKLCH 色相 +180°（等同 OKLab 的 a、b 取負號），亮度 L 保留。
  //    結果若超出 sRGB 能顯示的範圍，就用二分法降低彩度直到落在範圍內。
  //    回傳的物件多一個 clipped 欄位，表示是否有降低彩度。
  function complementOklch(rgb) {
    const { L, a, b } = rgbToOklab(rgb);
    const target = { L, a: -a, b: -b };
    if (inGamut(oklabToLinear(target))) return { ...oklabToRgb(target), clipped: false };

    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {
      const k = (lo + hi) / 2;
      if (inGamut(oklabToLinear({ L, a: -a * k, b: -b * k }))) lo = k;
      else hi = k;
    }
    return { ...oklabToRgb({ L, a: -a * lo, b: -b * lo }), clipped: true };
  }

  // 4. RYB 美術色輪（紅黃藍）。
  //    先把 RGB 色相分段線性對應到 RYB 色相，轉 180° 後再對應回來。
  //    錨點：紅 0°、黃 60°→120°、綠 120°→180°、藍 240°、紫 300°。
  //    得到的對應：紅↔綠、黃↔紫、藍↔橘。這是近似值，RYB 沒有唯一的標準公式。
  const RGB_STOPS = [0, 60, 120, 240, 360];
  const RYB_STOPS = [0, 120, 180, 240, 360];

  function remapHue(h, from, to) {
    h = mod(h, 360);
    for (let i = 0; i < from.length - 1; i++) {
      if (h <= from[i + 1]) {
        const t = (h - from[i]) / (from[i + 1] - from[i]);
        return to[i] + t * (to[i + 1] - to[i]);
      }
    }
    return h;
  }
  const rgbHueToRyb = (h) => remapHue(h, RGB_STOPS, RYB_STOPS);
  const rybHueToRgb = (h) => remapHue(h, RYB_STOPS, RGB_STOPS);

  function complementRyb(rgb) {
    const hsl = rgbToHsl(rgb);
    if (hsl.s === 0) return { ...roundRgb(rgb) };
    const h = rybHueToRgb(mod(rgbHueToRyb(hsl.h) + 180, 360));
    return hslToRgb({ ...hsl, h });
  }

  /* ---------- 其他工具 ---------- */

  // WCAG 2 相對亮度與對比度
  function relativeLuminance({ r, g, b }) {
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  function contrastRatio(c1, c2) {
    const a = relativeLuminance(c1);
    const b = relativeLuminance(c2);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  // 彩度很低（灰、黑、白）時沒有可靠的色相，也就沒有真正的互補色
  function isAchromatic(rgb) {
    return rgbToOklch(rgb).C < 0.02;
  }

  const formatRgb = ({ r, g, b }) => `rgb(${r}, ${g}, ${b})`;
  const formatHsl = ({ h, s, l }) => `hsl(${round(h)}, ${round(s)}%, ${round(l)}%)`;
  const formatOklch = ({ L, C, h }) => `oklch(${round(L * 100, 1)}% ${round(C, 3)} ${round(h, 1)})`;

  const api = {
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    rgbToOklab,
    oklabToRgb,
    rgbToOklch,
    complementHsl,
    complementInvert,
    complementOklch,
    complementRyb,
    rgbHueToRyb,
    rybHueToRgb,
    relativeLuminance,
    contrastRatio,
    isAchromatic,
    formatRgb,
    formatHsl,
    formatOklch,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ColorMath = api;
})(typeof self !== 'undefined' ? self : this);
