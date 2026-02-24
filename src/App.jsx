import React, { useEffect, useState, useRef } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

// =========================
// 1. API 配置
// =========================
const API_BASE = "https://stock-backend-g011.onrender.com"; 

function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export default function App() {
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // 使用 useRef 紀錄當前的搜尋關鍵字，避免計時器抓錯主題
  const currentQueryRef = useRef("全球市場 財經");

  // 取得新聞函式
  async function fetchNews(query) {
    // 如果 query 為空，則使用預設
    const searchQuery = query || "全球市場 財經";
    currentQueryRef.current = searchQuery;

    setNewsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/news?q=${encodeURIComponent(searchQuery)}&limit=10`));
      if (res.ok) {
        const data = await res.json();
        setNewsList(data);
      }
    } catch (err) {
      console.error("新聞抓取失敗:", err);
    } finally {
      setNewsLoading(false);
    }
  }

  // =========================
  // 2. 自動更新邏輯 (每小時)
  // =========================
  useEffect(() => {
    // 1. 初始載入
    fetchNews("全球市場 財經");

    // 2. 設定每小時 (3600000 ms) 自動更新一次
    const timer = setInterval(() => {
      console.log(`[${new Date().toLocaleTimeString()}] 執行自動新聞同步...`);
      fetchNews(currentQueryRef.current);
    }, 3600000);

    // 3. 卸載時清除計時器
    return () => clearInterval(timer);
  }, []);

  // 執行分析函式
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const targetSymbol = symbol.trim().toUpperCase();
      const res = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          symbol: targetSymbol, 
          principal: Number(principal),
          strategy: "none",
          duration: "mid"
        }),
      });
      if (!res.ok) throw new Error("分析失敗");
      const data = await res.json();
      setAnalysisResult(data);
      
      // 分析完後，將目前搜尋主題切換為該股票，並同步更新新聞
      fetchNews(targetSymbol);
    } catch (err) {
      alert(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // 雷達圖數據格式化
  const getRadarData = () => {
    if (!analysisResult) return [];
    const b = analysisResult.score_breakdown;
    return [
      { subject: "技術面", score: b.technical.score },
      { subject: "基本面", score: b.fundamental.score },
      { subject: "籌碼面", score: b.chip.score },
      { subject: "消息面", score: b.news.score },
    ];
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
      <header style={{ textAlign: "center", marginBottom: "30px", padding: "20px", background: "#1e293b", color: "white", borderRadius: "12px" }}>
        <h1>AI 股票戰情室</h1>
        <p style={{ fontSize: "12px", opacity: 0.8 }}>新聞每小時自動同步更新</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        
        {/* 左側：控制面板與新聞 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <h3>🔍 股票分析</h3>
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b" }}>股票代碼 (例: 2330.TW)</label>
              <input 
                style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)} 
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#64748b" }}>投資本金 (TWD)</label>
              <input 
                type="number"
                style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                value={principal} 
                onChange={(e) => setPrincipal(e.target.value)} 
              />
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{ width: "100%", padding: "12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              {analyzing ? "分析中..." : "開始 AI 診斷"}
            </button>
          </section>

          {/* 新聞列表區塊 */}
          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", flex: 1 }}>
            <h3 style={{ display: "flex", justifyContent: "space-between" }}>
              📰 相關新聞 
              {newsLoading && <small style={{ fontSize: "12px", color: "#3b82f6" }}>載入中...</small>}
            </h3>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              {newsList.length > 0 ? (
                newsList.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => n.url && window.open(n.url, "_blank", "noopener,noreferrer")}
                    style={{ 
                      width: "100%", textAlign: "left", padding: "12px", marginBottom: "10px", 
                      background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "8px", 
                      cursor: "pointer", transition: "all 0.2s" 
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}
                  >
                    <div style={{ fontSize: "10px", color: "#2563eb", fontWeight: "bold", marginBottom: "4px" }}>{n.tag}</div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>{n.title}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{n.source} • {n.time}</div>
                  </button>
                ))
              ) : (
                <p style={{ textAlign: "center", color: "#94a3b8" }}>尚無新聞資料</p>
              )}
            </div>
          </section>
        </div>

        {/* 右側：分析結果展示 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!analysisResult ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#e2e8f0", borderRadius: "12px", color: "#64748b" }}>
              請在左側輸入代號並點擊分析
            </div>
          ) : (
            <>
              {/* 分數與雷達圖 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ background: "white", padding: "20px", borderRadius: "12px", textAlign: "center" }}>
                  <h2 style={{ fontSize: "48px", margin: "10px 0", color: "#2563eb" }}>{analysisResult.ai_score}</h2>
                  <p style={{ fontWeight: "bold", color: "#1e293b" }}>綜合診斷：{analysisResult.ai_sentiment}</p>
                  <div style={{ marginTop: "20px", padding: "10px", background: "#eff6ff", borderRadius: "8px", textAlign: "left" }}>
                    <div style={{ fontSize: "14px" }}>💡 建議進場價：<b style={{ color: "#059669" }}>${analysisResult.advice.buy_price}</b></div>
                    <div style={{ fontSize: "14px" }}>🚀 目標獲利價：<b style={{ color: "#2563eb" }}>${analysisResult.advice.take_profit}</b></div>
                    <div style={{ fontSize: "14px" }}>⚠️ 停損防禦價：<b style={{ color: "#dc2626" }}>${analysisResult.advice.stop_loss}</b></div>
                  </div>
                </div>
                <div style={{ background: "white", padding: "10px", borderRadius: "12px", display: "flex", justifyContent: "center" }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="評分" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* K線圖表區 */}
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", height: "400px" }}>
                <h3 style={{ margin: "0 0 20px 0" }}>📈 價格趨勢與預測 (30天)</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={analysisResult.chart_data.history.concat(analysisResult.chart_data.prediction)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} hide />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#1e293b" strokeWidth={2} dot={false} name="歷史價" />
                    <Line type="monotone" dataKey="mid" stroke="#3b82f6" strokeDasharray="5 5" dot={false} name="AI預測" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
