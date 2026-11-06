/*
 * i18n.js — 介面多語言
 *
 * 支援：繁體中文（zh-Hant）、简体中文（zh-Hans）、English（en）、日本語（ja）
 * 語言決定順序：網址參數 ?lang=xx → 上次選擇的語言 → 瀏覽器語言 → English
 *
 * HTML 裡的文字用屬性標記：
 *   data-i18n="key"        取代元素的文字
 *   data-i18n-aria="key"   取代 aria-label
 *   data-i18n-title="key"  取代 title
 *
 * 新增語言：在 LANGS 加一筆、在 STRINGS 加一份同樣 key 的字串表即可。
 */
(function (root) {
  'use strict';

  const LANGS = [
    { code: 'zh-Hant', html: 'zh-Hant-TW', label: '繁體中文', short: '繁中' },
    { code: 'zh-Hans', html: 'zh-Hans-CN', label: '简体中文', short: '简中' },
    { code: 'en', html: 'en', label: 'English', short: 'EN' },
    { code: 'ja', html: 'ja', label: '日本語', short: '日本語' },
  ];

  const STRINGS = {
    'zh-Hant': {
      'meta.title': '互補色取色器',
      'meta.description': '上傳圖片，點選任一點取色，用 HSL、OKLCH、RGB 反相與 RYB 色輪四種方法算出互補色。',
      'app.title': '互補色取色器',
      'app.subtitle': '點圖片上的任何一點，看它在四種色彩模型裡的互補色。',
      'lang.label': '語言',
      'action.chooseImage': '選擇圖片',

      'workspace.aria': '圖片',
      'empty.title': '選擇一張圖片開始取色',
      'empty.text': '點這裡選擇圖片，或把圖片拖進來，也可以按 Ctrl+V（Mac 是 ⌘V）直接貼上',
      'canvas.aria': '圖片。點一下或拖曳來取色；聚焦後也可以用方向鍵移動取色點，按住 Shift 一次移動 10 像素。',
      'status.none': '還沒有載入圖片',
      'status.loaded': '{label}，{w} × {h} 像素',
      'status.scaled': '（太大了，已縮小為 {w} × {h} 來取色）',
      'status.pasted': '貼上的圖片',
      'sample.label': '取樣範圍',
      'sample.1': '單一像素',
      'sample.3': '3 × 3 平均',
      'sample.5': '5 × 5 平均',
      'sample.9': '9 × 9 平均',
      'loupe.transparent': '透明',

      'history.title': '取色紀錄',
      'history.clear': '清除紀錄',
      'history.empty': '取過的顏色會留在這裡，點一下就能叫回來。',
      'history.restore': '叫回 {hex}',
      'privacy': '所有運算都在你的瀏覽器裡進行，圖片不會上傳到任何地方。',

      'tabs.aria': '取色結果',
      'tab.picked': '取樣',
      'tab.chips': '互補色',
      'tab.wheel': '色相環',
      'tab.pairing': '搭配',
      'tab.history': '紀錄',

      'results.aria': '取色結果',
      'picked.aria': '取樣顏色',
      'picked.empty': '點一下圖片，取到的顏色和色碼會顯示在這裡。',
      'picked.name': '取樣顏色',
      'values.position': '位置',
      'values.positionValue': 'x {x}，y {y}',
      'copy.title': '複製',
      'copy.code': '複製色碼',
      'copy.aria': '複製 {hex}',

      'chips.title': '互補色',
      'chips.hint': '點色塊切換搭配預覽，點色碼複製',
      'chips.empty': '取色後，四種方法算出的互補色會顯示在這裡。',
      'chips.select': '用 {name} 的互補色預覽搭配',
      'chips.hue': '色相 {deg}°',
      'chips.noHue': '無色相',
      'alg.clipped': '已降低彩度以符合螢幕色域。',
      'alg.hsl.name': 'HSL 色相旋轉',
      'alg.hsl.short': 'HSL',
      'alg.hsl.desc': '色相轉 180°，飽和度與亮度不變。網頁設計最常用。',
      'alg.oklch.name': 'OKLCH',
      'alg.oklch.short': 'OKLCH',
      'alg.oklch.desc': '在感知均勻的色彩空間取對面，人眼看起來最平衡。',
      'alg.invert.name': 'RGB 反相',
      'alg.invert.short': '反相',
      'alg.invert.desc': '255 減去每個通道。色相和 HSL 相同，但亮度也反過來。',
      'alg.ryb.name': 'RYB 美術色輪',
      'alg.ryb.short': 'RYB',
      'alg.ryb.desc': '繪畫用的紅黃藍色輪：紅對綠、黃對紫、藍對橘（近似換算）。',

      'wheel.title': '色相位置',
      'wheel.empty': '取色後，這裡會標出取樣顏色和各互補色在色相環上的位置。',
      'wheel.aria': '色相環，標出取樣顏色與各種互補色的位置',
      'wheel.hint': '色相環以 HSL 色相繪製。RGB 反相的色相與 HSL 相同，只差在亮度；OKLCH 和 RYB 則會落在不同的位置。',
      'wheel.picked': '取樣',
      'wheel.pickedHue': '取樣色相',
      'wheel.noHue': '灰階沒有色相',
      'achromatic.note': '這是灰階顏色，沒有色相，所以沒有真正的互補色。HSL、OKLCH 和 RYB 都會得到幾乎同一個灰，RGB 反相則會得到明暗相反的灰。',

      'pairing.title': '搭配預覽',
      'pairing.titleWith': '搭配預覽：{name}',
      'pairing.empty': '取色後，這裡會預覽兩個顏色放在一起的樣子和文字對比度。',
      'pairing.sample': '文字 Aa',
      'pairing.captionA': '取樣色當底、互補色當字',
      'pairing.captionB': '互補色當底、取樣色當字',
      'contrast.ratio': '對比度 {ratio} : 1',
      'contrast.aaa': '對比充足，可以用在內文（WCAG AAA）。',
      'contrast.aa': '可以用在內文（WCAG AA）。',
      'contrast.large': '只適合大字或圖示（WCAG AA 大字標準）。',
      'contrast.low': '對比不足以當文字，適合用在色塊之間的搭配。',

      'drop.overlay': '放開即可載入圖片',
      'toast.notImage': '這不是圖片檔，請選擇 PNG、JPG、WebP 或 GIF',
      'toast.unreadable': '瀏覽器無法讀取這個格式，請轉成 PNG 或 JPG 再試一次',
      'toast.transparent': '這個位置是透明的，換一個地方試試',
      'toast.copied': '已複製 {text}',
    },

    'zh-Hans': {
      'meta.title': '互补色取色器',
      'meta.description': '上传图片，点选任一点取色，用 HSL、OKLCH、RGB 反相与 RYB 色轮四种方法算出互补色。',
      'app.title': '互补色取色器',
      'app.subtitle': '点击图片上的任意一点，查看它在四种色彩模型里的互补色。',
      'lang.label': '语言',
      'action.chooseImage': '选择图片',

      'workspace.aria': '图片',
      'empty.title': '选择一张图片开始取色',
      'empty.text': '点这里选择图片，或把图片拖进来，也可以按 Ctrl+V（Mac 是 ⌘V）直接粘贴',
      'canvas.aria': '图片。点一下或拖动来取色；聚焦后也可以用方向键移动取色点，按住 Shift 一次移动 10 像素。',
      'status.none': '还没有加载图片',
      'status.loaded': '{label}，{w} × {h} 像素',
      'status.scaled': '（太大了，已缩小为 {w} × {h} 来取色）',
      'status.pasted': '粘贴的图片',
      'sample.label': '取样范围',
      'sample.1': '单一像素',
      'sample.3': '3 × 3 平均',
      'sample.5': '5 × 5 平均',
      'sample.9': '9 × 9 平均',
      'loupe.transparent': '透明',

      'history.title': '取色记录',
      'history.clear': '清除记录',
      'history.empty': '取过的颜色会留在这里，点一下就能调回来。',
      'history.restore': '调回 {hex}',
      'privacy': '所有运算都在你的浏览器里进行，图片不会上传到任何地方。',

      'tabs.aria': '取色结果',
      'tab.picked': '取样',
      'tab.chips': '互补色',
      'tab.wheel': '色相环',
      'tab.pairing': '搭配',
      'tab.history': '记录',

      'results.aria': '取色结果',
      'picked.aria': '取样颜色',
      'picked.empty': '点一下图片，取到的颜色和色值会显示在这里。',
      'picked.name': '取样颜色',
      'values.position': '位置',
      'values.positionValue': 'x {x}，y {y}',
      'copy.title': '复制',
      'copy.code': '复制色值',
      'copy.aria': '复制 {hex}',

      'chips.title': '互补色',
      'chips.hint': '点色块切换搭配预览，点色值复制',
      'chips.empty': '取色后，四种方法算出的互补色会显示在这里。',
      'chips.select': '用 {name} 的互补色预览搭配',
      'chips.hue': '色相 {deg}°',
      'chips.noHue': '无色相',
      'alg.clipped': '已降低彩度以符合屏幕色域。',
      'alg.hsl.name': 'HSL 色相旋转',
      'alg.hsl.short': 'HSL',
      'alg.hsl.desc': '色相转 180°，饱和度与亮度不变。网页设计最常用。',
      'alg.oklch.name': 'OKLCH',
      'alg.oklch.short': 'OKLCH',
      'alg.oklch.desc': '在感知均匀的色彩空间取对面，人眼看起来最平衡。',
      'alg.invert.name': 'RGB 反相',
      'alg.invert.short': '反相',
      'alg.invert.desc': '255 减去每个通道。色相和 HSL 相同，但亮度也反过来。',
      'alg.ryb.name': 'RYB 美术色轮',
      'alg.ryb.short': 'RYB',
      'alg.ryb.desc': '绘画用的红黄蓝色轮：红对绿、黄对紫、蓝对橙（近似换算）。',

      'wheel.title': '色相位置',
      'wheel.empty': '取色后，这里会标出取样颜色和各互补色在色相环上的位置。',
      'wheel.aria': '色相环，标出取样颜色与各种互补色的位置',
      'wheel.hint': '色相环以 HSL 色相绘制。RGB 反相的色相与 HSL 相同，只差在亮度；OKLCH 和 RYB 则会落在不同的位置。',
      'wheel.picked': '取样',
      'wheel.pickedHue': '取样色相',
      'wheel.noHue': '灰阶没有色相',
      'achromatic.note': '这是灰阶颜色，没有色相，所以没有真正的互补色。HSL、OKLCH 和 RYB 都会得到几乎同一个灰，RGB 反相则会得到明暗相反的灰。',

      'pairing.title': '搭配预览',
      'pairing.titleWith': '搭配预览：{name}',
      'pairing.empty': '取色后，这里会预览两个颜色放在一起的样子和文字对比度。',
      'pairing.sample': '文字 Aa',
      'pairing.captionA': '取样色做底、互补色做字',
      'pairing.captionB': '互补色做底、取样色做字',
      'contrast.ratio': '对比度 {ratio} : 1',
      'contrast.aaa': '对比充足，可以用在正文（WCAG AAA）。',
      'contrast.aa': '可以用在正文（WCAG AA）。',
      'contrast.large': '只适合大字或图标（WCAG AA 大字标准）。',
      'contrast.low': '对比不足以做文字，适合用在色块之间的搭配。',

      'drop.overlay': '松开即可加载图片',
      'toast.notImage': '这不是图片文件，请选择 PNG、JPG、WebP 或 GIF',
      'toast.unreadable': '浏览器无法读取这个格式，请转成 PNG 或 JPG 再试一次',
      'toast.transparent': '这个位置是透明的，换一个地方试试',
      'toast.copied': '已复制 {text}',
    },

    en: {
      'meta.title': 'Complementary Color Picker',
      'meta.description': 'Load an image, click any point to pick a color, and get its complement four ways: HSL, OKLCH, RGB inversion and the RYB color wheel.',
      'app.title': 'Complementary Color Picker',
      'app.subtitle': 'Click any point in an image to see its complement in four color models.',
      'lang.label': 'Language',
      'action.chooseImage': 'Choose image',

      'workspace.aria': 'Image',
      'empty.title': 'Choose an image to start',
      'empty.text': 'Click here to choose an image, drag one in, or paste with Ctrl+V (⌘V on Mac)',
      'canvas.aria': 'Image. Click or drag to pick a color. When focused, move the picker with the arrow keys; hold Shift to move 10 pixels at a time.',
      'status.none': 'No image loaded',
      'status.loaded': '{label}, {w} × {h} px',
      'status.scaled': ' (too large, scaled to {w} × {h} for picking)',
      'status.pasted': 'Pasted image',
      'sample.label': 'Sample size',
      'sample.1': 'Single pixel',
      'sample.3': '3 × 3 average',
      'sample.5': '5 × 5 average',
      'sample.9': '9 × 9 average',
      'loupe.transparent': 'Transparent',

      'history.title': 'History',
      'history.clear': 'Clear history',
      'history.empty': 'Colors you pick stay here. Click one to bring it back.',
      'history.restore': 'Restore {hex}',
      'privacy': 'Everything runs in your browser. Your images are never uploaded.',

      'tabs.aria': 'Results',
      'tab.picked': 'Picked',
      'tab.chips': 'Complements',
      'tab.wheel': 'Wheel',
      'tab.pairing': 'Pairing',
      'tab.history': 'History',

      'results.aria': 'Results',
      'picked.aria': 'Picked color',
      'picked.empty': 'Click the image to see the picked color and its codes here.',
      'picked.name': 'Picked color',
      'values.position': 'Position',
      'values.positionValue': 'x {x}, y {y}',
      'copy.title': 'Copy',
      'copy.code': 'Copy color code',
      'copy.aria': 'Copy {hex}',

      'chips.title': 'Complements',
      'chips.hint': 'Swatch to preview, code to copy',
      'chips.empty': 'After you pick a color, its four complements appear here.',
      'chips.select': 'Preview the pairing with the {name} complement',
      'chips.hue': 'Hue {deg}°',
      'chips.noHue': 'No hue',
      'alg.clipped': ' Chroma lowered to fit sRGB.',
      'alg.hsl.name': 'HSL rotation',
      'alg.hsl.short': 'HSL',
      'alg.hsl.desc': 'Hue +180°, same saturation and lightness. The usual choice on the web.',
      'alg.oklch.name': 'OKLCH',
      'alg.oklch.short': 'OKLCH',
      'alg.oklch.desc': 'Opposite hue in a perceptual space; looks the most balanced.',
      'alg.invert.name': 'RGB inversion',
      'alg.invert.short': 'Invert',
      'alg.invert.desc': '255 minus each channel. Same hue as HSL, but lightness flips too.',
      'alg.ryb.name': 'RYB art wheel',
      'alg.ryb.short': 'RYB',
      'alg.ryb.desc': "Painter's wheel: red↔green, yellow↔purple, blue↔orange (approx.).",

      'wheel.title': 'Hue positions',
      'wheel.empty': 'After you pick a color, this shows where it and each complement sit on the hue wheel.',
      'wheel.aria': 'Hue wheel marking the picked color and each complement',
      'wheel.hint': 'Drawn with HSL hue. RGB inversion shares the HSL hue and differs only in lightness; OKLCH and RYB land elsewhere.',
      'wheel.picked': 'Picked',
      'wheel.pickedHue': 'picked hue',
      'wheel.noHue': 'grays have no hue',
      'achromatic.note': 'This is a gray, so it has no hue and no true complement. HSL, OKLCH and RYB return almost the same gray; RGB inversion returns the opposite gray.',

      'pairing.title': 'Pairing preview',
      'pairing.titleWith': 'Pairing preview: {name}',
      'pairing.empty': 'After you pick a color, this previews the two colors together and their text contrast.',
      'pairing.sample': 'Text Aa',
      'pairing.captionA': 'Picked background, complement text',
      'pairing.captionB': 'Complement background, picked text',
      'contrast.ratio': 'Contrast {ratio} : 1',
      'contrast.aaa': 'Plenty of contrast for body text (WCAG AAA).',
      'contrast.aa': 'Works for body text (WCAG AA).',
      'contrast.large': 'Large text and icons only (WCAG AA large text).',
      'contrast.low': 'Too low for text. Better for color blocks side by side.',

      'drop.overlay': 'Drop to load the image',
      'toast.notImage': "That's not an image. Choose a PNG, JPG, WebP or GIF.",
      'toast.unreadable': "Your browser can't read this format. Convert it to PNG or JPG and try again.",
      'toast.transparent': 'This spot is transparent. Try another one.',
      'toast.copied': 'Copied {text}',
    },

    ja: {
      'meta.title': '補色カラーピッカー',
      'meta.description': '画像を読み込み、好きな場所をクリックして色を取得。HSL・OKLCH・RGB 反転・RYB 色相環の 4 つの方法で補色を求めます。',
      'app.title': '補色カラーピッカー',
      'app.subtitle': '画像の好きな場所をクリックすると、4 つの色モデルでの補色を表示します。',
      'lang.label': '言語',
      'action.chooseImage': '画像を選択',

      'workspace.aria': '画像',
      'empty.title': '画像を選んで色を取得',
      'empty.text': 'ここをクリックして画像を選ぶか、ドラッグ＆ドロップ、または Ctrl+V（Mac は ⌘V）で貼り付け',
      'canvas.aria': '画像。クリックまたはドラッグで色を取得します。フォーカス中は矢印キーで移動でき、Shift を押すと 10 ピクセルずつ動きます。',
      'status.none': '画像が読み込まれていません',
      'status.loaded': '{label}、{w} × {h} ピクセル',
      'status.scaled': '（大きすぎるため {w} × {h} に縮小して取得）',
      'status.pasted': '貼り付けた画像',
      'sample.label': '取得範囲',
      'sample.1': '1 ピクセル',
      'sample.3': '3 × 3 平均',
      'sample.5': '5 × 5 平均',
      'sample.9': '9 × 9 平均',
      'loupe.transparent': '透明',

      'history.title': '履歴',
      'history.clear': '履歴を消去',
      'history.empty': '取得した色はここに残ります。クリックで呼び出せます。',
      'history.restore': '{hex} を呼び出す',
      'privacy': 'すべての処理はブラウザ内で行われ、画像はどこにもアップロードされません。',

      'tabs.aria': '取得結果',
      'tab.picked': '取得色',
      'tab.chips': '補色',
      'tab.wheel': '色相環',
      'tab.pairing': '配色',
      'tab.history': '履歴',

      'results.aria': '取得結果',
      'picked.aria': '取得した色',
      'picked.empty': '画像をクリックすると、取得した色とカラーコードがここに表示されます。',
      'picked.name': '取得した色',
      'values.position': '位置',
      'values.positionValue': 'x {x}、y {y}',
      'copy.title': 'コピー',
      'copy.code': 'カラーコードをコピー',
      'copy.aria': '{hex} をコピー',

      'chips.title': '補色',
      'chips.hint': '色見本で配色を切り替え、コードをクリックでコピー',
      'chips.empty': '色を取得すると、4 つの方法で求めた補色がここに表示されます。',
      'chips.select': '{name} の補色で配色をプレビュー',
      'chips.hue': '色相 {deg}°',
      'chips.noHue': '色相なし',
      'alg.clipped': '色域外のため彩度を下げています。',
      'alg.hsl.name': 'HSL 色相回転',
      'alg.hsl.short': 'HSL',
      'alg.hsl.desc': '色相を 180° 回転し、彩度と明度はそのまま。Web で最も一般的。',
      'alg.oklch.name': 'OKLCH',
      'alg.oklch.short': 'OKLCH',
      'alg.oklch.desc': '知覚的に均一な色空間で反対側を取る。最もバランスよく見える。',
      'alg.invert.name': 'RGB 反転',
      'alg.invert.short': '反転',
      'alg.invert.desc': '各チャンネルを 255 から引く。色相は HSL と同じで、明度も反転する。',
      'alg.ryb.name': 'RYB 色相環',
      'alg.ryb.short': 'RYB',
      'alg.ryb.desc': '絵の具の赤黄青の色相環：赤↔緑、黄↔紫、青↔橙（近似）。',

      'wheel.title': '色相の位置',
      'wheel.empty': '色を取得すると、取得色と各補色の色相環上の位置をここに表示します。',
      'wheel.aria': '取得色と各補色の位置を示す色相環',
      'wheel.hint': '色相環は HSL の色相で描いています。RGB 反転は HSL と同じ色相で明度だけが異なり、OKLCH と RYB は別の位置になります。',
      'wheel.picked': '取得色',
      'wheel.pickedHue': '取得色の色相',
      'wheel.noHue': 'グレーは色相なし',
      'achromatic.note': 'グレーには色相がないため、本当の補色はありません。HSL・OKLCH・RYB はほぼ同じグレーになり、RGB 反転は明暗が逆のグレーになります。',

      'pairing.title': '配色プレビュー',
      'pairing.titleWith': '配色プレビュー：{name}',
      'pairing.empty': '色を取得すると、2 色を並べた見え方と文字のコントラスト比をここに表示します。',
      'pairing.sample': '文字 Aa',
      'pairing.captionA': '取得色の背景に補色の文字',
      'pairing.captionB': '補色の背景に取得色の文字',
      'contrast.ratio': 'コントラスト比 {ratio} : 1',
      'contrast.aaa': '十分なコントラスト。本文に使えます（WCAG AAA）。',
      'contrast.aa': '本文に使えます（WCAG AA）。',
      'contrast.large': '大きな文字やアイコン向け（WCAG AA 大きな文字）。',
      'contrast.low': '文字には不向き。色面同士の組み合わせに向いています。',

      'drop.overlay': 'ドロップして画像を読み込む',
      'toast.notImage': '画像ファイルではありません。PNG・JPG・WebP・GIF を選んでください',
      'toast.unreadable': 'この形式はブラウザで読み込めません。PNG か JPG に変換してもう一度お試しください',
      'toast.transparent': 'この位置は透明です。別の場所を選んでください',
      'toast.copied': '{text} をコピーしました',
    },
  };

  const STORAGE_KEY = 'complement-picker:lang';
  const DEFAULT = 'en';
  const listeners = [];
  let current = DEFAULT;

  // 把各種語言標籤（zh-TW、zh_HK、ja-JP、en-US…）對應到支援的語言
  function normalize(tag) {
    const t = String(tag || '').trim().toLowerCase().replace(/_/g, '-');
    if (!t) return null;
    if (t.startsWith('zh')) return /hant|-tw|-hk|-mo/.test(t) ? 'zh-Hant' : 'zh-Hans';
    if (t.startsWith('ja')) return 'ja';
    if (t.startsWith('en')) return 'en';
    return null;
  }

  function detect() {
    try {
      const fromUrl = normalize(new URLSearchParams(location.search).get('lang'));
      if (fromUrl) return fromUrl;
    } catch { /* 忽略 */ }
    try {
      const saved = normalize(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch { /* 無痕模式等情況下讀不到，忽略 */ }
    const prefs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for (const p of prefs) {
      const n = normalize(p);
      if (n) return n;
    }
    return DEFAULT;
  }

  // 取得翻譯；{name} 會換成 params.name。找不到時依序退回 English、繁體中文、key 本身
  function t(key, params) {
    const table = STRINGS[current] || STRINGS[DEFAULT];
    let s = table[key];
    if (s == null) s = STRINGS.en[key];
    if (s == null) s = STRINGS['zh-Hant'][key];
    if (s == null) return key;
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
    return s;
  }

  function apply(scope) {
    const rootEl = scope || document;
    rootEl.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    rootEl.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    rootEl.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  }

  function info(code) {
    return LANGS.find((l) => l.code === code) || LANGS.find((l) => l.code === DEFAULT);
  }

  function setLang(code, remember) {
    const next = normalize(code) || DEFAULT;
    current = next;
    if (remember) {
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* 忽略 */ }
    }
    document.documentElement.lang = info(next).html;
    document.title = t('meta.title');
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));
    apply();
    listeners.forEach((fn) => fn(next));
  }

  const api = {
    LANGS,
    STRINGS,
    t,
    apply,
    info,
    normalize,
    setLang,
    get lang() { return current; },
    onChange(fn) { listeners.push(fn); },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // 讓測試可以在 Node.js 裡檢查字串表
    return;
  }
  root.I18n = api;
  setLang(detect(), false);
})(typeof self !== 'undefined' ? self : this);
