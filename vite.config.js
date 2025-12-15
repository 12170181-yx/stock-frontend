// ===============================
// 檔案：stock-frontend/vite.config.js
// 目的：本機用 Vite Proxy 轉發到 FastAPI
// 上線（Vercel）時前端會用 VITE_API_BASE 直連後端，不會用到 proxy
// ===============================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 分析 / 新聞 / 收藏 / K線 / 資產 都走 /api
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      // OAuth2 token endpoint
      "/token": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      // 註冊 endpoint
      "/register": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
      // 健康檢查（喚醒後端用）
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
