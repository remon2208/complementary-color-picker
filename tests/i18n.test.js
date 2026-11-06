// 執行方式：node --test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const I18n = require('../i18n.js');

const root = path.join(__dirname, '..');
const codes = I18n.LANGS.map((l) => l.code);
const base = Object.keys(I18n.STRINGS['zh-Hant']).sort();

test('每種語言都有完全相同的 key', () => {
  for (const code of codes) {
    const keys = Object.keys(I18n.STRINGS[code]).sort();
    assert.deepEqual(keys, base, code);
  }
});

test('每種語言的參數 {xxx} 都一致', () => {
  const params = (s) => (s.match(/\{\w+\}/g) || []).sort();
  for (const key of base) {
    const expected = params(I18n.STRINGS['zh-Hant'][key]);
    for (const code of codes) assert.deepEqual(params(I18n.STRINGS[code][key]), expected, `${code} ${key}`);
  }
});

test('沒有空字串', () => {
  for (const code of codes) {
    for (const [key, value] of Object.entries(I18n.STRINGS[code])) assert.ok(value.trim(), `${code} ${key}`);
  }
});

test('HTML 和 app.js 用到的 key 都存在', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const used = new Set();
  for (const m of html.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)) used.add(m[1]);
  for (const m of js.matchAll(/\bt\('([^']+)'/g)) used.add(m[1]);
  for (const m of js.matchAll(/`alg\.\$\{[^}]+\}\.(\w+)`/g)) {
    for (const alg of ['hsl', 'oklch', 'invert', 'ryb']) used.add(`alg.${alg}.${m[1]}`);
  }
  assert.ok(used.size > 40, `只找到 ${used.size} 個 key，偵測方式可能有問題`);
  for (const key of used) assert.ok(base.includes(key), `缺少 key：${key}`);
});

test('語言標籤對應', () => {
  const n = I18n.normalize;
  assert.equal(n('zh-TW'), 'zh-Hant');
  assert.equal(n('zh_HK'), 'zh-Hant');
  assert.equal(n('zh-Hant-MO'), 'zh-Hant');
  assert.equal(n('zh-CN'), 'zh-Hans');
  assert.equal(n('zh'), 'zh-Hans');
  assert.equal(n('ja-JP'), 'ja');
  assert.equal(n('en-GB'), 'en');
  assert.equal(n('fr'), null);
});

test('參數替換與找不到 key 時的退回', () => {
  // 在 Node.js 裡沒有呼叫 setLang，所以使用預設語言 English
  assert.equal(I18n.lang, 'en');
  assert.equal(I18n.t('toast.copied', { text: '#FFFFFF' }), 'Copied #FFFFFF');
  assert.equal(I18n.t('values.positionValue', { x: 3, y: 4 }), 'x 3, y 4');
  assert.equal(I18n.t('no.such.key'), 'no.such.key');
});
