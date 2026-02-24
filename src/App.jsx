import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// =========================
// API Base 設定
// =========================
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

export default function App() {
  // ===== 輸入區狀態 =====
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [strategy, setStrategy] = useState("none");
  const [duration, setDuration] = useState("mid");

  // ===== 本地收藏狀態 =====
  const [favorites, setFavorites] = useState([]);

  // ===== 分析與數據狀態 =====
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
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

    // 2. 取得新聞
    async function fetchNews() {
      setNewsLoading(true);
      try {
        const res = await fetchWithTimeout(apiUrl("/api/news"), {}, 15000);
        if (res.ok) {
          const data = await res.json();
          setNewsList(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("新聞載入失敗:", err);
      } finally {
        setNewsLoading(false);
      }
    }
    fetchNews();
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
    setPortfolio(null);
    setKlineData(null);

    const s = symbol.trim().toUpperCase();
    if (!s) {
      setAnalysisError("請輸入股票代碼");
      setAnalyzing(false);
      return;
    }

    let durationLabel = "中期(60日)";
    if (duration === "day") durationLabel = "當沖(1日)";
    else if (duration === "short") durationLabel = "短期(5日)";
    else if (duration === "long") durationLabel = "長期(1年)";

    try {
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
        60000 
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `分析失敗 (HTTP ${res.status})`);
      }

      const data = await res.json();
      setAnalysisResult(data);

      // 自動計算模擬資產
      if (data.price && principal) {
        const qty = Math.floor(Number(principal) / data.price);
        const cost = qty * data.price;
        setPortfolio({
          total_asset: Number(principal),
          total_cost: cost,
          cash: Number(principal) - cost,
          shares: qty
        });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        setAnalysisError("連線逾時。Render 伺服器喚醒中，請稍後再試。");
      } else {
        setAnalysisError(err.message || "發生未知錯誤");
      }
    } finally {
      setAnalyzing(false);
    }
  }

  // =========================
  // 功能：載入 K 線 (模擬趨勢)
  // =========================
  async function loadKlineDetail() {
    if (!analysisResult) return;
    setKlineLoading(true);
    try {
      await new Promise(r => setTimeout(r, 600)); 
      const mockData = Array.from({length: 20}, (_, i) => ({
        day: i + 1,
        price: (analysisResult.price * (0.95 + Math.random() * 0.1))
      }));
      setKlineData(mockData);
    } catch (e) {
      console.error("K線載入錯誤");
    } finally {
      setKlineLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "sans-serif" }}>
      
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "20px 24px", background: "#1e293b", borderRadius: "16px", color: "white" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>🚀 AI 投資戰情室</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: "0.85rem" }}>全功能開放版 · 市場數據即時分析</p>
        </div>
        <div style={{ fontSize: "0.8rem", background: "#059669", padding: "4px 12px", borderRadius: "20px" }}>Server Online</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* 左側欄：操作區 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* 參數設定卡片 */}
          <section style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#374151" }}>📊 參數設定</h3>
            <div style={{ display: "grid", gap: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "6px", fontWeight: "600" }}>股票代碼</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input 
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="2330.TW / NVDA"
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
                  />
                  <button onClick={toggleFavorite} style={{ padding: "0 15px", borderRadius: "8px", border: "1px solid #d1d5db", background: isFavorite ? "#fffbeb" : "white", color: isFavorite ? "#f59e0b" : "#9ca3af", cursor: "pointer" }}>
                    {isFavorite ? "★" : "☆"}
                  </button>
                </div>
                {favorites.length > 0 && (
                  <div style={{ marginTop: "10px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {favorites.map(f => (
                      <span key={f} onClick={() => setSymbol(f)} style={{ fontSize: "0.7rem", background: "#f3f4f6", padding: "3px 8px", borderRadius: "10px", cursor: "pointer" }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.9rem", marginBottom: "6px", fontWeight: "600" }}>投資本金</label>
                <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <select value={strategy} onChange={(e) => setStrategy(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                  <option value="none">綜合分析</option>
                  <option value="value">價值投資</option>
                  <option value="swing">波段操作</option>
                </select>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                  <option value="mid">中期(60日)</option>
                  <option value="day">當沖(1日)</option>
                  <option value="long">長期(1年)</option>
                </select>
              </div>

              <button 
                onClick={handleAnalyze} 
                disabled={analyzing}
                style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: analyzing ? "#94a3b8" : "#2563eb", color: "white", fontWeight: "700", cursor: "pointer" }}
              >
                {analyzing ? "分析中..." : "⚡ 開始 AI 分析"}
              </button>
              
              {analysisError && <div style={{ color: "#ef4444", fontSize: "0.85rem", background: "#fef2f2", padding: "10px", borderRadius: "8px" }}>{analysisError}</div>}
            </div>
          </section>

          {/* 新聞卡片 */}
          <section style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", flex: 1 }}>
            <h3 style={{ marginTop: 0 }}>📰 市場快訊</h3>
            <div style={{ maxHeight: "350px", overflowY: "auto" }}>
              {newsLoading ? <p>載入中...</p> : newsList.map((n, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <a href={n.link} target="_blank" rel="noreferrer" style={{ textDecoration: "none", color: "#1f2937", fontSize: "0.9rem", fontWeight: "500" }}>{n.title}</a>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>{n.source}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 右側欄：分析結果 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {analysisResult ? (
            <>
              <div style={{ background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "2rem" }}>{analysisResult.symbol}</h2>
                    <p style={{ color: "#4b5563", fontSize: "1.2rem", fontWeight: "bold" }}>${formatNumber(analysisResult.price)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>AI 評分</span>
                    <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "#2563eb" }}>{analysisResult.ai_score}</div>
                  </div>
                </div>

                <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", marginTop: "20px", borderLeft: "4px solid #2563eb" }}>
                  <strong>AI 建議：</strong> {analysisResult.suggestion}
                </div>
              </div>

              {portfolio && (
                <div style={{ background: "white", padding: "20px", borderRadius: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>可買股數</div>
                    <div style={{ fontWeight: "700" }}>{formatNumber(portfolio.shares)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>預估成本</div>
                    <div style={{ fontWeight: "700" }}>${formatNumber(portfolio.total_cost)}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>剩餘現金</div>
                    <div style={{ fontWeight: "700" }}>${formatNumber(portfolio.cash)}</div>
                  </div>
                </div>
              )}

              <div style={{ background: "white", padding: "20px", borderRadius: "16px", height: "300px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0 }}>📈 趨勢模擬</h3>
                  <button onClick={loadKlineDetail} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem" }}>
                    {klineLoading ? "載入中..." : "更新圖表"}
                  </button>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={klineData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" hide />
                    <YAxis domain={['auto', 'auto']} fontSize={10} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ height: "100%", minHeight: "400px", background: "white", borderRadius: "16px", border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "3rem" }}>💡</div>
                <p>請在左側輸入代碼並點擊分析<br/>AI 將為您生成深度報告</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <footer style={{ marginTop: "40px", textAlign: "center", fontSize: "0.75rem", color: "#9ca3af" }}>
        資料來源：Yahoo Finance / AI Model 運算 · API: {API_BASE}
      </footer>
    </div>
  );
}
