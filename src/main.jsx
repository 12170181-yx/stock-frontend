// ===============================
// 檔案：stock-frontend/src/main.jsx
// 目的：React 應用程式入口點
// 功能：掛載 App 元件、引入全域樣式 (index.css)
// ===============================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css"; // ⚠️ 重要：必須引入這裡，剛剛的深色主題才會生效

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    // StrictMode 會在開發模式下執行兩次 Effect (用來檢查副作用)，
    // 如果看到 console.log 出現兩次是正常的。
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("❌ 嚴重錯誤：找不到 id 為 'root' 的 DOM 節點，請檢查 index.html");
}