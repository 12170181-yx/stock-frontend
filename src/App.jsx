import React, { useEffect, useState } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

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
  // ===== 狀態管理 =====
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [strategy, setStrategy] = useState("none");
  const [duration, setDuration] = useState("mid");
  const [favorites, setFavorites] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [klineData, setKlineData] = useState(null);
  const [klineLoading, setKlineLoading] = useState(false);
  const [portfolio, setPortfolio] = useState(null);

  // 初始化：載入收藏與新聞
  useEffect(() => {
    const savedFavs = JSON.parse(localStorage.getItem("stock_favorites") || "[]");
    setFavorites(savedFavs);

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

  function toggleFavorite() {
    const s = symbol.trim().toUpperCase();
    if (!s) return;
    let newFavs = favorites.includes(s) ? favorites.filter(f => f !== s) : [...favorites, s];
    setFavorites(newFavs);
    localStorage.setItem("stock_favorites", JSON.stringify(newFavs));
  }

  const isFavorite = favorites.includes(symbol.trim().toUpperCase());

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);
    setPortfolio(null);
    setKlineData(null);

    const s = symbol.trim().toUpperCase();
    let durationLabel = duration === "day" ? "當沖(1日)" : duration === "short" ? "短期(5日)" : duration === "long" ? "長期(1年)" : "中期(60日)";

    try {
      const res = await fetchWithTimeout(apiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: s, principal: Number(principal), strategy, duration: durationLabel }),
      }, 60000);

      if (!res.ok) throw new Error("分析失敗，請檢查代碼");
      const data = await res.json();
      setAnalysisResult(data);

      if (data.price && principal) {
        const qty = Math.floor(Number(principal) / data.price);
        setPortfolio({ shares: qty, total_cost: qty * data.price, cash: Number(principal) - (qty * data.price) });
      }
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

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
    } finally { setKlineLoading(false); }
  }

  const getRadarData = () => {
    if (!analysisResult || !analysisResult.score_breakdown) return [];
    const mapping = { technical: "技術", fundamental: "基本", chip: "籌碼", news: "消息" };
    return Object.entries(analysisResult.score_breakdown).map(([key, value]) => ({
      subject: mapping[key] || key,
      score: value,
      fullMark: 10
    }));
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px", backgroundColor: "#f3f4f6", minHeight: "100vh", fontFamily: "sans-serif" }}>
      
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "20px 24px", background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", borderRadius: "16px", color: "white", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem" }}>🚀 AI 投資戰情室</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: "0.85rem" }}>全功能開放版 · 市場數據即時分析</p>
        </div>
        <div style={{ fontSize: "0.8rem", background: "#059669", padding: "6px 16px", borderRadius: "20px", fontWeight: "bold" }}>Server Online</div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        
        {/* 左側欄：操作與新聞 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#374151", borderLeft: "4px solid #2563eb", paddingLeft: "10px" }}>📊 參數設定</h3>
            <div style={{ display: "grid", gap: "15px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
                <button onClick={toggleFavorite} style={{ padding: "0 15px", borderRadius: "8px", border: "1px solid #d1d5db", background: isFavorite ? "#fffbeb" : "white", color: isFavorite ? "#f59e0b" : "#9ca3af", cursor: "pointer" }}>{isFavorite ? "★" : "☆"}</button>
              </div>
              <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", boxSizing: "border-box" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <select value={strategy} onChange={(e) => setStrategy(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                  <option value="none">綜合分析</option><option value="value">價值投資</option><option value="swing">波段操作</option>
                </select>
                <select value={duration} onChange={(e) => setDuration(e.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                  <option value="mid">中期(60日)</option><option value="day">當沖(1日)</option><option value="long">長期(1年)</option>
                </select>
              </div>
              <button onClick={handleAnalyze} disabled={analyzing} style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "none", background: analyzing ? "#94a3b8" : "#2563eb", color: "white", fontWeight: "700", cursor: "pointer" }}>
                {analyzing ? "⚡ 分析中..." : "開始 AI 分析"}
              </button>
              {analysisError && <div style={{ color: "#ef4444", fontSize: "0.85rem", textAlign: "center" }}>{analysisError}</div>}
            </div>
          </section>

          {/* 市場快訊 - 強化連結點擊 */}
          <section style={{ background: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", flex: 1 }}>
            <h3 style={{ marginTop: 0, marginBottom: "15px" }}>📰 市場快訊</h3>
            <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}>
              {newsLoading ? (
                <p style={{ textAlign: "center", color: "#9ca3af" }}>載入中...</p>
              ) : newsList.length > 0 ? (
                newsList.map((n, i) => (
                  <div key={i} style={{ marginBottom: "10px" }}>
                    <a 
                      href={n.link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        textDecoration: "none", 
                        color: "inherit", 
                        display: "block",
                        padding: "12px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "10px",
                        border: "1px solid transparent",
                        transition: "all 0.2s ease",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#eff6ff";
                        e.currentTarget.style.borderColor = "#bfdbfe";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                        e.currentTarget.style.borderColor = "transparent";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#1e293b", marginBottom: "6px", lineHeight: "1.4" }}>
                        {n.title}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#e2e8f0", padding: "2px 8px", borderRadius: "4px" }}>
                          {n.source}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#3b82f6", fontWeight: "bold" }}>閱讀原文 →</span>
                      </div>
                    </a>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#9ca3af" }}>目前暫無新聞資料</p>
              )}
            </div>
          </section>
        </div>

        {/* 右側欄：分析結果 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {analysisResult ? (
            <>
              <div style={{ background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "2rem" }}>{analysisResult.symbol}</h2>
                    <p style={{ color: "#2563eb", fontSize: "1.4rem", fontWeight: "bold", margin: "5px 0" }}>${formatNumber(analysisResult.price)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: "bold" }}>AI 綜合評分</span>
                    <div style={{ fontSize: "3rem", fontWeight: "900", color: analysisResult.ai_score >= 60 ? "#059669" : "#dc2626" }}>{analysisResult.ai_score}</div>
                  </div>
                </div>

                <div style={{ height: "220px", margin: "20px 0" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                      <Radar name="評分" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: "#f0f9ff", padding: "15px", borderRadius: "12px", borderLeft: "4px solid #0ea5e9" }}>
                  <strong style={{ color: "#0369a1" }}>💡 AI 建議：</strong> 
                  <span style={{ color: "#0c4a6e", lineHeight: "1.6" }}>{analysisResult.suggestion}</span>
                </div>
              </div>

              {portfolio && (
                <div style={{ background: "white", padding: "20px", borderRadius: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", textAlign: "center" }}>
                  <div><div style={{ fontSize: "0.8rem", color: "#6b7280" }}>可買股數</div><div style={{ fontWeight: "700" }}>{formatNumber(portfolio.shares)}</div></div>
                  <div><div style={{ fontSize: "0.8rem", color: "#6b7280" }}>預估成本</div><div style={{ fontWeight: "700" }}>${formatNumber(portfolio.total_cost)}</div></div>
                  <div><div style={{ fontSize: "0.8rem", color: "#6b7280" }}>剩餘現金</div><div style={{ fontWeight: "700" }}>${formatNumber(portfolio.cash)}</div></div>
                </div>
              )}

              <div style={{ background: "white", padding: "20px", borderRadius: "16px", height: "300px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem" }}>📈 趨勢模擬預測</h3>
                  <button onClick={loadKlineDetail} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem" }}>{klineLoading ? "載入中..." : "🔄 更新數據"}</button>
                </div>
                <ResponsiveContainer width="100%" height="85%">
                  <LineChart data={klineData || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" hide />
                    <YAxis domain={['auto', 'auto']} fontSize={10} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} />
                    <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={3} dot={false} animationDuration={1000} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div style={{ height: "100%", minHeight: "500px", background: "white", borderRadius: "16px", border: "2px dashed #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", textAlign: "center" }}>
              <div><div style={{ fontSize: "3rem", marginBottom: "10px" }}>🧠</div><p>請在左側輸入代碼並點擊分析<br/>AI 將為您生成深度報告</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
