# ImL1s 個人作品集

全端開發者 ImL1s 的個人作品集著陸頁，展示跨平台專案（Flutter、React、TypeScript）、AI/區塊鏈錢包、教育類 App 與開源學習資源。頁面支援多語系（繁中 / 簡中 / 英文 / 日文）、漸層動態背景與精緻卡片動畫，直接部署於 GitHub Pages。

## 線上預覽
- https://iml1s.github.io

## 亮點
- 多語系切換：內建繁中、簡中、英文、日文，字串來源 `js/i18n.js`。
- Hero 數據：公開專案、上架應用、支援區塊鏈數量一目了然。
- 豐富專案牆（截圖 / 徽章 / 技術標籤 / 連結）：涵蓋 Web、Mobile、Chrome Extension、開源專案。
- 深色霓虹風格：自訂 CSS 變數、玻璃化卡片、平滑 hover/scroll 動畫。
- SEO / 社群完整度：OG、Twitter、結構化資料（Person / WebSite / ItemList / Breadcrumb）。

## 精選專案一覽
- StickerAI Studio：Gemini AI 生成 LINE 規格貼圖，Web / iOS / Android，React + Flutter + Supabase。
- Light Wallet（含 Extension）：支援 43+ 多鏈錢包與瀏覽器擴充，Flutter、Ethers.js、TypeScript。
- 加密 AI 分析：Next.js + FastAPI，整合 Fear & Greed、ETF 資金流等指標並加上 AI 圖表解讀。
- 保險證照題庫、計程車執業模擬考：Flutter + Firebase + AI 助手，行動 / Web 全平台。
- AutoStar 汽車實價登錄：38 品牌二手車行情、折舊分析，Flutter + Clean Architecture。
- Multi-Language Hello World、TodoList 100+ 技術棧：開源學習型專案集合。

## 技術棧
- 前端 / 樣式：原生 HTML、CSS、SVG，自訂設計系統與動畫。
- 前端互動：Vanilla JS（語系切換、下拉選單、平滑捲動）。
- 資產：`assets/og-image.png`、專案截圖及品牌圖示。
- 部署：GitHub Pages 靜態站。

## 快速開始（本機預覽）
```bash
git clone https://github.com/ImL1s/ImL1s.github.io.git
cd ImL1s.github.io
# 任選一種
python3 -m http.server 3000   # 或用 VS Code Live Server、任意靜態伺服器
open http://localhost:3000
```

## 專案結構
```
index.html          # 主頁（版面、動效、內容區塊）
js/i18n.js          # 多語系字串與切換邏輯
assets/             # 圖示、OG 圖、截圖
  icons/
  screenshots/
app-ads.txt
robots.txt, sitemap.xml, 404.html, light-wallet-privacy.html
```

## 編輯重點
- 內容調整：直接編輯 `index.html`，或在 `js/i18n.js` 補充多語系文案。
- 圖片更新：替換 `assets/` 內截圖或圖示，保持檔名即可沿用。
- 色系 / 動畫：於 `index.html` 的 CSS 變數（`:root`）與 keyframes 調整。

## 部署
- 專案為純靜態檔案，推送至 `main`（預設 Pages 分支）即可自動更新：https://iml1s.github.io
- 如需自訂網域，於 Repo Settings → Pages 設定 CNAME 並新增 DNS 記錄。

