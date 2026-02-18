// ===============================
// 檔案：stock-frontend/vite.config.js
// 目的：Vite 設定檔 (含 Proxy 轉發)
// ===============================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // 強制固定 Port，避免自動跳號導致後端 CORS 擋掉
    proxy: {
      // 1. 主要 API (分析、新聞、K線、資產)
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      // 2. 健康檢查 (確認後端是否存活)
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      // 3. 除錯用路由 (剛剛後端新增的，用來檢查 yfinance 抓取狀態)
      "/debug": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});