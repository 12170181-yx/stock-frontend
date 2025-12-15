// ===============================
// 檔案：stock-frontend/src/main.jsx
// 目的：React 入口，維持 Vite + React 標準寫法
// ===============================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
