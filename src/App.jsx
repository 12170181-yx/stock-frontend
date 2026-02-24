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
  
  // --- 持有期限狀態 (確保預設值與 option value 一致) ---
  const [duration, setDuration] = useState("mid");
  
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const currentQueryRef = useRef("全球市場 財經");

  async function fetchNews(query) {
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

  useEffect(() => {
    fetchNews("全球市場 財經");
    const timer = setInterval(() => {
      fetchNews(currentQueryRef.current);
    }, 3600000);
    return () => clearInterval(timer);
  }, []);

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
          duration: duration 
        }),
      });
      if (!res.ok) throw new Error("分析失敗");
      const data = await res.json();
      setAnalysisResult(data);
      fetchNews(targetSymbol);
    } catch (err) {
      alert(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

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
        
        {/* 左側面板 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", position: "relative", zIndex: 10 }}>
            <h3>🔍 投資參數</h3>
            
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b" }}>股票代碼 (例: 2330.TW)</label>
              <input 
                style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)} 
              />
            </div>

            {/* 修改點：優化後的下拉選單 */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", color: "#64748b" }}>預計持有期限</label>
              <select 
                style={{ 
                  width: "100%", 
                  padding: "10px", 
                  marginTop: "5px", 
                  borderRadius: "6px", 
                  border: "2px solid #3b82f6", // 加強邊框顏色提示可點擊
                  background: "white",
                  cursor: "pointer",
                  display: "block",
                  boxSizing: "border-box",
                  fontSize: "14px"
                }}
                value={duration}
                onChange={(e) => {
                  console.log("選擇的期限:", e.target.value);
                  setDuration(e.target.value);
                }}
              >
                <option value="short">短線 (1-2 週)</option>
                <option value="mid">中線 (1-3 個月)</option>
                <option value="long">長線 (半年以上)</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#64748b" }}>投資本金 (TWD)</label>
              <input 
                type="number"
                style={{ width: "100%", padding: "10px", marginTop: "5px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
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

          {/* 新聞列表保持原樣 */}
          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", flex: 1 }}>
            <h3 style={{ display: "flex", justifyContent: "space-between" }}>
              📰 相關新聞 
              {newsLoading && <small style={{ fontSize: "12px", color: "#3b82f6" }}>載入中...</small>}
            </h3>
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {newsList.map((n, i) => (
                <div key={i} style={{ padding: "10px", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ fontSize: "12px", color: "#2563eb" }}>{n.tag}</div>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>{n.title}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{n.time}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 右側結果展示保持原樣 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!analysisResult ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#e2e8f0", borderRadius: "12px", color: "#64748b" }}>
              請設定參數並點擊分析
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ background: "white", padding: "20px", borderRadius: "12px", textAlign: "center" }}>
                  <h2 style={{ fontSize: "48px", margin: "10px 0", color: "#2563eb" }}>{analysisResult.ai_score}</h2>
                  <p>綜合診斷：{analysisResult.ai_sentiment}</p>
                </div>
                <div style={{ background: "white", padding: "10px", borderRadius: "12px" }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", height: "400px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysisResult.chart_data.history.concat(analysisResult.chart_data.prediction)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#1e293b" dot={false} />
                    <Line type="monotone" dataKey="mid" stroke="#3b82f6" strokeDasharray="5 5" dot={false} />
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
