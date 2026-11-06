# 互補色取色器

上傳一張圖片，點選圖片上的任何一點取色，網頁會用四種不同的演算法算出它的互補色，並顯示色相位置與搭配預覽。

純前端、不需要安裝任何套件或建置步驟，可以直接放上 GitHub Pages。圖片只在瀏覽器裡處理，不會上傳到任何地方。

## 功能

- 載入圖片：按「選擇圖片」、把檔案拖進網頁，或直接用 Ctrl+V／⌘V 貼上截圖
- 點一下或按住拖曳取色，滑鼠移動時有放大鏡可以看清楚每個像素
- 取樣範圍可選單一像素，或 3×3、5×5、9×9 的平均色（照片有雜訊時比較準）
- 四種互補色演算法並排比較，點色碼就能複製
- 色相環標出取樣色與各互補色的位置
- 搭配預覽與 WCAG 對比度，判斷能不能拿來當文字顏色
- 取色紀錄（存在瀏覽器的 localStorage）
- 支援手機觸控、鍵盤操作（聚焦圖片後用方向鍵移動，Shift 一次 10 像素）、深色與淺色模式

## 部署到 GitHub Pages

1. 在 GitHub 建立一個新的 repository，例如 `complementary-color-picker`
2. 把這個資料夾裡的檔案上傳（或用 git push）到 `main` 分支的根目錄
3. 到 repository 的 **Settings → Pages**
4. **Source** 選 **Deploy from a branch**，Branch 選 `main`、資料夾選 `/ (root)`，按 **Save**
5. 等一兩分鐘，網址會是 `https://你的帳號.github.io/complementary-color-picker/`

用指令推上去的話：

```bash
git init
git add .
git commit -m "互補色取色器"
git branch -M main
git remote add origin https://github.com/你的帳號/complementary-color-picker.git
git push -u origin main
```

## 本機執行

直接用瀏覽器打開 `index.html` 就可以用。

## 檔案結構

```
├── index.html          頁面結構
├── style.css           樣式
├── color.js            互補色演算法（不依賴網頁，可單獨在 Node.js 使用）
├── app.js              介面邏輯：載入圖片、取色、放大鏡、顯示結果
└── tests/
    └── color.test.js   演算法測試
```

## 演算法

| 方法 | 做法 | 特性 |
| --- | --- | --- |
| HSL 色相旋轉 | 色相 +180°，飽和度與亮度不變 | 網頁設計最常用 |
| OKLCH | 在 OKLab 色彩空間把 a、b 取負號（等同色相 +180°） | 感知均勻，人眼看起來最平衡 |
| RGB 反相 | 每個通道 `255 − 值` | 色相與 HSL 相同，但亮度也反轉 |
| RYB 美術色輪 | 把 RGB 色相對應到紅黃藍色輪，轉 180° 再對應回來 | 紅↔綠、黃↔紫、藍↔橘，近似換算 |

HSL 色相旋轉有一個不用轉換色彩空間的捷徑：

```
新值 = max(R, G, B) + min(R, G, B) − 原值
```

例如 `#3366CC` → `#CC9933`，`#800000` → `#008080`。

OKLCH 算出的顏色有時會超出 sRGB 螢幕能顯示的範圍，這時程式會用二分法降低彩度，直到顏色落在範圍內，並在色票上註明。

灰色、黑色、白色沒有色相，所以沒有真正的互補色，網頁會顯示提示。

`color.js` 也可以在其他專案裡單獨使用：

```js
const ColorMath = require('./color.js');   // 瀏覽器裡則是全域變數 ColorMath

const rgb = ColorMath.hexToRgb('#3366CC');
ColorMath.rgbToHex(ColorMath.complementHsl(rgb));    // '#CC9933'
ColorMath.rgbToHex(ColorMath.complementOklch(rgb));
ColorMath.rgbToHex(ColorMath.complementInvert(rgb));
ColorMath.rgbToHex(ColorMath.complementRyb(rgb));
```

## 測試

需要 Node.js 18 以上：

```bash
node --test
```

測試內容包含已知顏色的結果、HSL 捷徑公式與完整轉換的比對、OKLCH 互補色的亮度與色相檢查，以及 RYB 色相對應能否來回轉換。

## 限制

- 取色結果是瀏覽器把圖片轉成 sRGB 之後的值。帶有色彩描述檔（例如 iPhone 的 Display P3 照片）的圖片，數值可能和修圖軟體裡看到的略有不同。
- 超過約 1,600 萬像素的圖片會先縮小再取色，避免手機瀏覽器記憶體不足。
- HEIC 等格式只有部分瀏覽器支援（例如 Safari），其他瀏覽器請先轉成 JPG 或 PNG。
