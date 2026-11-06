// 執行方式：node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../color.js');

const hex = (rgb) => C.rgbToHex(rgb);
const fromHex = (h) => C.hexToRgb(h);

test('HEX 互轉', () => {
  assert.deepEqual(fromHex('#3366CC'), { r: 51, g: 102, b: 204 });
  assert.deepEqual(fromHex('f00'), { r: 255, g: 0, b: 0 });
  assert.equal(hex({ r: 51, g: 102, b: 204 }), '#3366CC');
  assert.throws(() => fromHex('#12345'));
});

test('HSL 色相旋轉', () => {
  assert.equal(hex(C.complementHsl(fromHex('#800000'))), '#008080');
  assert.equal(hex(C.complementHsl(fromHex('#3366CC'))), '#CC9933');
  assert.equal(hex(C.complementHsl(fromHex('#FF0000'))), '#00FFFF');
  // 灰色沒有色相，結果不變
  assert.equal(hex(C.complementHsl(fromHex('#777777'))), '#777777');
});

test('HSL 捷徑公式與「轉 HSL、加 180°、轉回來」結果一致', () => {
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) % 256;
  for (let i = 0; i < 2000; i++) {
    const rgb = { r: rand(), g: rand(), b: rand() };
    const fast = C.complementHsl(rgb);
    const hsl = C.rgbToHsl(rgb);
    const slow = C.hslToRgb({ ...hsl, h: hsl.h + 180 });
    for (const k of ['r', 'g', 'b']) assert.ok(Math.abs(fast[k] - slow[k]) <= 1, `${hex(rgb)} ${k}`);
    // 亮度與飽和度不變
    const h2 = C.rgbToHsl(fast);
    assert.ok(Math.abs(h2.l - hsl.l) < 0.5);
    assert.ok(Math.abs(h2.s - hsl.s) < 0.5);
  }
});

test('RGB 反相', () => {
  assert.equal(hex(C.complementInvert(fromHex('#FF0000'))), '#00FFFF');
  assert.equal(hex(C.complementInvert(fromHex('#800000'))), '#7FFFFF');
});

test('RYB 美術色輪：紅↔綠、黃↔紫、藍↔橘', () => {
  assert.equal(hex(C.complementRyb(fromHex('#FF0000'))), '#00FF00');
  assert.equal(hex(C.complementRyb(fromHex('#FFFF00'))), '#FF00FF');
  assert.equal(hex(C.complementRyb(fromHex('#0000FF'))), '#FF8000');
  // #FF8000 的色相是 30.1°（128/255 不剛好是一半），所以結果是藍色附近而不是剛好 #0000FF
  assert.ok(Math.abs(C.rgbToHsl(C.complementRyb(fromHex('#FF8000'))).h - 240) < 1);
  // 色相對應可以來回轉換
  for (let h = 0; h < 360; h += 7) assert.ok(Math.abs(C.rybHueToRgb(C.rgbHueToRyb(h)) - h) < 1e-9);
});

test('OKLab 基準值', () => {
  const white = C.rgbToOklab({ r: 255, g: 255, b: 255 });
  assert.ok(Math.abs(white.L - 1) < 1e-4 && Math.abs(white.a) < 1e-4 && Math.abs(white.b) < 1e-4);
  const red = C.rgbToOklch({ r: 255, g: 0, b: 0 });
  assert.ok(Math.abs(red.L - 0.628) < 1e-3);
  assert.ok(Math.abs(red.C - 0.2577) < 1e-3);
  assert.ok(Math.abs(red.h - 29.23) < 0.1);
});

test('OKLCH 互補色：亮度保留、色相差 180°、一律落在 sRGB 內', () => {
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) % 256;
  let clippedCount = 0;
  for (let i = 0; i < 2000; i++) {
    const rgb = { r: rand(), g: rand(), b: rand() };
    const comp = C.complementOklch(rgb);
    for (const k of ['r', 'g', 'b']) assert.ok(comp[k] >= 0 && comp[k] <= 255);
    if (comp.clipped) clippedCount++;
    const a = C.rgbToOklch(rgb);
    const b = C.rgbToOklch(comp);
    assert.ok(Math.abs(a.L - b.L) < 0.01, `亮度 ${hex(rgb)}`);
    if (a.C > 0.03 && b.C > 0.03) {
      const diff = Math.abs((((b.h - a.h) % 360) + 360) % 360 - 180);
      assert.ok(diff < 3, `色相 ${hex(rgb)} → ${hex(comp)}：差 ${diff}`);
    }
    // 沒有被降低彩度時，再算一次互補色要回到原色
    if (!comp.clipped) {
      const back = C.complementOklch(comp);
      for (const k of ['r', 'g', 'b']) assert.ok(Math.abs(back[k] - rgb[k]) <= 2, `來回 ${hex(rgb)}`);
    }
  }
  assert.ok(clippedCount > 0, '應該有部分顏色需要降低彩度');
});

test('對比度', () => {
  assert.ok(Math.abs(C.contrastRatio(fromHex('#000'), fromHex('#fff')) - 21) < 1e-9);
  assert.equal(C.contrastRatio(fromHex('#777'), fromHex('#777')), 1);
});

test('灰階判斷', () => {
  assert.equal(C.isAchromatic(fromHex('#808080')), true);
  assert.equal(C.isAchromatic(fromHex('#FFFFFF')), true);
  assert.equal(C.isAchromatic(fromHex('#3366CC')), false);
});
