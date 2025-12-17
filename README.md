# siteMap
# 🗺️ 新北市都更地點查詢系統

### Demo 網址
https://gtut3252300.github.io/sitemap/

[![Live Demo](https://img.shields.io/badge/LIVE%20DEMO-GitHub%20Pages-4BC5A7.svg)](
    https://gtut3252300.github.io/sitemap/#/
)
[![Framework](https://img.shields.io/badge/Vue-3.x-4FC08D.svg)](https://vuejs.org/)
[![Map Library](https://img.shields.io/badge/Map-Leaflet.js-green)](https://leafletjs.com/)

---

## 🎯 專案目標與挑戰 (Goal & Challenge)

本專案旨在提供新北市特定區域的都市更新地點查詢服務，並著重於前端技術整合的穩定性。

### 核心挑戰：原生第三方登入
最大的挑戰是依據考題要求，**完全不依賴 Firebase 或高階 NPM 套件**，自行實現 Google 與 Facebook 的 OAuth 2.0 登入流程，並處理狀態綁定。

### 核心功能
* ✅ **雙重身份驗證：** 必須同時完成 Google 登入 **與** Facebook 綁定才能解鎖查詢功能。
* ✅ **原生 SDK 集成：** 使用 Google Identity Services (GIS) 與 Facebook JS SDK 實現登入。
* ✅ **地圖核心：** 使用 Leaflet.js 進行地圖渲染。
* ✅ **雙頭像 Tooltip：** 在使用者定位 Pin 上方，顯示 Google 與 Facebook 兩個大頭貼。
* ✅ **GeoJSON 渲染：** 成功解析並在地圖上繪製都更區域 Polygon (GeoJSON)。
* ✅ **部署環境：** 部署於 GitHub Pages，並解決 Vite Subpath 與 Leaflet 路徑問題。

---

## ⚙️ 技術堆疊 (Tech Stack)

| 類別 | 技術名稱 | 說明 |
| :--- | :--- | :--- |
| **框架/建構** | Vue 3 (Composition API) / Vite | 現代化前端開發與極速熱重載。|
| **UI 組件** | Element Plus / SCSS | 提供高品質 UI 介面及佈局。 |
| **地圖服務** | Leaflet.js | 輕量、快速的地圖函式庫，負責地圖渲染、Markers 與 Polygon。|
| **網路請求** | Axios / 原生 Fetch | 處理 API 呼叫。 |
| **部署** | GitHub Pages / gh-pages | 靜態網站部署。 |
| **具備響應式** |  | 適應不同裝置顯示系統，提供手機版和電腦版觀看。 |

---

## 🚀 專案啟動與設定 (Getting Started)

### 1. 安裝與啟動

```bash
# 安裝依賴
npm install

# 啟動本地開發伺服器 (https://localhost:5173/)
# 注意：若未啟用 HTTPS，FB/Google SDK 會報錯
npm run dev
