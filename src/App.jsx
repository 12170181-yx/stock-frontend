// ===============================
// 檔案：stock-frontend/src/App.jsx
// 目的：移除登入系統，將所有功能改為公開模式 (配合 main.py 修改)
// ===============================

import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// =========================
// API Base 設定 (已修改為連線 Render)
// =========================
// 邏輯：
// 1. 預設使用你剛剛提供的 Render 後端網址
// 2. .replace(/\/$/, "") 是為了確保網址最後面沒有多餘的斜線
const API_BASE = (import.meta.env.VITE_API_URL || "https://stock-backend-g011.onrender.com").replace(/\/$/, "");

function apiUrl(path) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}${path}`;
}

// =========================
// 工具函式
// =========================
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Render/Vercel 冷啟動喚醒
async function warmUpBackend() {
  try {
    // 嘗試打一個輕量 API
    await fetchWithTimeout(apiUrl("/"), { method: "GET" }, 5000).catch(() => {});
  } catch {
    // 忽略錯誤
  }
}

export default function App() {
  // ===== 輸入區 =====
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [strategy, setStrategy] = useState("none");
  const [duration, setDuration] = useState("mid");

  // ===== 收藏 (改為 LocalStorage) =====
  const [favorites, setFavorites] = useState([]);

  // ===== 分析結果 =====
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);

  // ===== 新聞 =====
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // ===== K 線 / 資產 (模擬) =====
  const [klineData, setKlineData] = useState(null);
  const [klineLoading, setKlineLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);

  // =========================
  // 初始化：讀取新聞 & 本地收藏
  // =========================
  useEffect(() => {
    // 1. 讀取收藏
    const savedFavs = JSON.parse(localStorage.getItem("stock_favorites") || "[]");
    setFavorites(savedFavs);

    // 2. 喚醒後端並取得新聞
    async function initData() {
      try {
        setNewsLoading(true);
        // 先不用 await warmUpBackend() 以免卡住太久，直接請求新聞
        console.log(`正在連線到後端: ${API_BASE}`);
        
        const res = await fetchWithTimeout(apiUrl("/api/news"), {}, 15000);
        if (res.ok) {
          const data = await res.json();
          setNewsList(Array.isArray(data) ? data : []);
        } else {
            console.warn("新聞載入失敗，狀態碼:", res.status);
        }
      } catch (err) {
        console.error("無法連線到後端:", err);
      } finally {
        setNewsLoading(false);
      }
    }
    initData();
  }, []);

  // =========================
  // 功能：收藏 (Local Storage)
  // =========================
  function toggleFavorite() {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    
    let newFavs;
    if (favorites.includes(s)) {
      newFavs = favorites.filter((item) => item !== s);
    } else {
      newFavs = [...favorites, s];
    }
    setFavorites(newFavs);
    localStorage.setItem("stock_favorites", JSON.stringify(newFavs));
  }
  const isFavorite = favorites.includes(symbol.trim().toUpperCase());

  // =========================
  // 功能：執行分析
  // =========================
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);
    setPortfolio(null); // 清空舊的資產模擬
    setKlineData(null); // 清空舊的K線

    const s = symbol.trim();
    if (!s) {
      setAnalysisError("請輸入股票代碼");
      setAnalyzing(false);
      return;
    }

    // 轉換 duration標籤 (配合後端邏輯)
    let durationLabel = "中期(60日)";
    if (duration === "day") durationLabel = "當沖(1日)";
    else if (duration === "short") durationLabel = "短期(5日)";
    else if (duration === "long") durationLabel = "長期(1年)";

    try {
      console.log(`發送分析請求至: ${apiUrl("/api/analyze")}`);
      const res = await fetchWithTimeout(
        apiUrl("/api/analyze"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: s,
            principal: Number(principal),
            strategy,
            duration: durationLabel,
          }),
        },
        60000 // 分析通常比較久，給 60 秒 Timeout
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `分析失敗 (HTTP ${res.status})`);
      }

      const data = await res.json();
      setAnalysisResult(data);

      // 分析成功後，自動產生一個模擬資產結果
      if (data.price && principal) {
        const qty = Math.floor(Number(principal) / data.price);
        const cost = qty * data.price;
        setPortfolio({
            total_asset: Number(principal), // 假設尚未波動
            total_cost: cost,
            cash: Number(principal) - cost,
            shares: qty,
            roi_rate: 0
        });
      }

    } catch (err) {
      console.error("API Error:", err);
      if (err.name === "AbortError") {
        setAnalysisError("連線逾時，請檢查後端是否啟動 (Render 休眠中，請再試一次)。");
      } else if (err.message.includes("Failed to fetch")) {
        setAnalysisError("無法連線到後端伺服器。");
      } else {
        setAnalysisError(err.message || "發生未知錯誤");
      }
    } finally {
      setAnalyzing(false);
    }
  }

  // =========================
  // 功能：載入 K 線 (模擬/公開 API)
  // =========================
  async function loadKlineDetail() {
    setKlineLoading(true);
    try {
        // 這裡暫時模擬
        await new Promise(r => setTimeout(r, 800)); 
        const mockData = Array.from({length: 30}, (_, i) => ({
            day: i,
            price: (analysisResult?.price || 100) + (Math.random() * 10 - 5)
        }));
        setKlineData(mockData);
    } catch (e) {
        alert("K線資料讀取錯誤");
    } finally {
        setKlineLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1024, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1f2937" }}>
      
      {/* 標題列 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, padding: 16, background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderRadius: 16, color: "white", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
        <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>🚀 AI 投資戰情室</h1>
            <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 4 }}>全功能開放版 (無須登入)</div>
        </div>
        <div style={{ fontSize: "0.85rem", background: "rgba(255,255,255,0.1)", padding: "4px 12px", borderRadius: 20 }}>
            System Status: Online
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        
        {/* 左側：控制面板 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* 1. 輸入參數卡片 */}
            <div style={{ background: "white", padding: 20, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 700, color: "#374151" }}>📊 參數設定</h3>
                
                <div style={{ display: "grid", gap: 16 }}>
                    {/* 股票代碼 */}
                    <div>
                        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: 6, color: "#4b5563" }}>股票代碼</label>
                        <div style={{ display: "flex", gap: 8 }}>
                            <input 
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                placeholder="例: 2330.TW, NVDA"
                                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "1rem" }}
                            />
                            <button 
                                onClick={toggleFavorite}
                                style={{ padding: "0 14px", fontSize: "1.2rem", border: "1px solid #d1d5db", borderRadius: 8, background: isFavorite ? "#fffbeb" : "white", color: isFavorite ? "#d97706" : "#9ca3af", cursor: "pointer" }}
                                title="加入/移除收藏"
                            >
                                {isFavorite ? "★" : "☆"}
                            </button>
                        </div>
                        {favorites.length > 0 && (
                            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {favorites.map(fav => (
                                    <span key={fav} onClick={() => setSymbol(fav)} style={{ fontSize: "0.75rem", background: "#f3f4f6", padding: "2px 8px", borderRadius: 12, cursor: "pointer", color: "#4b5563" }}>
                                        {fav}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 本金 */}
                    <div>
                        <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, marginBottom: 6, color: "#4b5563" }}>投資本金 (TWD/USD)</label>
                        <input 
                            type="number"
                            value={principal}
                            onChange={(e) => setPrincipal(e.target.value)}
                            style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "1rem", boxSizing: "border-box" }}
                        />
                    </div>

                    {/* 策略與期間 */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "#4b5563" }}>策略風格</label>
                            <select 
                                value={strategy} 
                                onChange={(e) => setStrategy(e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #d1d5db", background: "white" }}
                            >
                                <option value="none">綜合分析</option>
                                <option value="value">價值投資</option>
                                <option value="swing">波段操作</option>
                                <option value="momentum">動能交易</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: 6, color: "#4b5563" }}>持有期間</label>
                            <select 
                                value={duration} 
                                onChange={(e) => setDuration(e.target.value)}
                                style={{ width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #d1d5db", background: "white" }}
                            >
                                <option value="day">當沖 (1日)</option>
                                <option value="short">短期 (5日)</option>
                                <option value="mid">中期 (60日)</option>
                                <option value="long">長期 (1年)</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        style={{ 
                            marginTop: 10, padding: "14px", borderRadius: 10, border: "none", 
                            background: analyzing ? "#94a3b8" : "#2563eb", 
                            color: "white", fontSize: "1rem", fontWeight: 700, 
                            cursor: analyzing ? "not-allowed" : "pointer",
                            transition: "background 0.2s"
                        }}
                    >
                        {analyzing ? "AI 分析運算中..." : "⚡ 開始分析"}
                    </button>
                    
                    {analysisError && (
                        <div style={{ padding: 12, background: "#fef2f2", color: "#ef4444", borderRadius: 8, fontSize: "0.9rem", border: "1px solid #fee2e2" }}>
                            ⚠️ {analysisError}
                        </div>
                    )}
                </div>
            </div>

             {/* 2. 新聞區塊 */}
             <div style={{ background: "white", padding: 20, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb", flex: 1 }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                    <span>📰 市場快訊</span>
                    {newsLoading && <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "#6b7280" }}>更新中...</span>}
                </h3>
                <div style={{ maxHeight: 400, overflowY: "auto", display: "grid", gap: 10 }}>
                    {!newsLoading && newsList.length === 0 && <div style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>暫無新聞</div>}
                    {newsList.map((news, idx) => (
                        <div key={idx} style={{ padding: 12, borderRadius: 8, background: "#f8fafc", borderLeft: "3px solid #3b82f6" }}>
                            <a href={news.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "#1f2937", fontWeight: 600, fontSize: "0.95rem", display: "block", marginBottom: 4 }}>
                                {news.title}
                            </a>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                                <span>{news.source || "News"}</span>
                                <span>{news.published || ""}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* 右側：分析結果展示 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {analysisResult ? (
                <>
                    {/* 主要結果卡片 */}
                    <div style={{ background: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", border: "1px solid #e5e7eb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, borderBottom: "1px solid #f1f5f9", paddingBottom: 16 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: "1.8rem", color: "#111827" }}>{analysisResult.symbol}</h2>
                                <div style={{ color: "#6b7280", marginTop: 4 }}>現價: <span style={{ color: "#111827", fontWeight: 700, fontSize: "1.2rem" }}>{formatNumber(analysisResult.price)}</span></div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: "0.9rem", color: "#6b7280" }}>AI 綜合評分</div>
                                <div style={{ fontSize: "2.5rem", fontWeight: 800, color: analysisResult.ai_score >= 80 ? "#16a34a" : analysisResult.ai_score >= 60 ? "#d97706" : "#dc2626", lineHeight: 1 }}>
                                    {analysisResult.ai_score}
                                </div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: analysisResult.ai_score >= 60 ? "#16a34a" : "#dc2626", marginTop: 4 }}>
                                    {analysisResult.ai_sentiment}
                                </div>
                            </div>
                        </div>

                        {/* 四大面向評分 */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                            {analysisResult.score_breakdown && Object.entries(analysisResult.score_breakdown).map(([key, score]) => (
                                <div key={key} style={{ background: "#f8fafc", padding: 10, borderRadius: 10, textAlign: "center" }}>
                                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 4, textTransform: "capitalize" }}>
                                        {key === 'technical' ? '技術' : key === 'fundamental' ? '基本' : key === 'chip' ? '籌碼' : '消息'}
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: "1.1rem", color: score >= 5 ? "#059669" : "#d97706" }}>{score}</div>
                                </div>
                            ))}
                        </div>

                        {/* 建議區塊 */}
                        <div style={{ background: "#eff6ff", padding: 16, borderRadius: 12, color: "#1e40af", fontSize: "0.95rem", lineHeight: 1.6 }}>
                            <strong>💡 AI 建議：</strong>
                            {analysisResult.suggestion || "目前觀望中，請參考下方詳細數據。"}
                        </div>
                    </div>

                    {/* 模擬資產卡片 */}
                    {portfolio && (
                        <div style={{ background: "white", padding: 20, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
                            <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem", fontWeight: 700 }}>💰 試算模擬資產 (基於輸入本金)</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>可買股數</div>
                                    <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{formatNumber(portfolio.shares)} 股</div>
                                </div>
                                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>預估成本</div>
                                    <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>${formatNumber(portfolio.total_cost)}</div>
                                </div>
                                <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8 }}>
                                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>剩餘現金</div>
                                    <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>${formatNumber(portfolio.cash)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* K線圖表卡片 */}
                    <div style={{ background: "white", padding: 20, borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #e5e7eb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>📈 價格走勢預測</h3>
                            <button onClick={loadKlineDetail} style={{ fontSize: "0.85rem", padding: "6px 12px", background: "#f1f5f9", border: "none", borderRadius: 6, cursor: "pointer" }}>
                                {klineLoading ? "載入中..." : "重新載入"}
                            </button>
                        </div>
                        
                        <div style={{ height: 250, width: "100%" }}>
                            {klineData ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={klineData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="day" hide />
                                        <YAxis domain={['auto', 'auto']} fontSize={12} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", background: "#f9fafb", borderRadius: 8 }}>
                                    點擊載入以查看走勢
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: 16, minHeight: 400 }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "3rem", marginBottom: 10 }}>🤖</div>
                        <div>在左側輸入代碼並點擊分析<br/>AI 將為您生成報告</div>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <div style={{ textAlign: "center", marginTop: 40, color: "#9ca3af", fontSize: "0.8rem" }}>
          API Source: {API_BASE}
      </div>
    </div>
  );
}