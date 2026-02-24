import React, { useEffect, useState, useRef } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';

const API_BASE = "https://stock-backend-g011.onrender.com"; 

function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export default function App() {
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [duration, setDuration] = useState("mid");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const currentQueryRef = useRef("全球市場 財經");

  // 計算投報數據的輔助函式
  const calculateROI = () => {
    if (!analysisResult || !analysisResult.chart_data?.prediction) return null;
    
    const buyPrice = analysisResult.advice.buy_price;
    // 取預測數據的最後一個點作為目標持有期滿的價格
    const predictionData = analysisResult.chart_data.prediction;
    const targetPrice = predictionData[predictionData.length - 1].mid;
    
    const shares = Math.floor(principal / buyPrice); // 可購買股數
    const expectedProfit = Math.round(shares * (targetPrice - buyPrice));
    const roiPercentage = (((targetPrice - buyPrice) / buyPrice) * 100).toFixed(2);
    
    return {
      targetPrice: targetPrice.toFixed(1),
      shares,
      expectedProfit,
      roiPercentage
    };
  };

  const roiData = calculateROI();

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

  const inputStyle = {
    width: "100%", padding: "12px", marginTop: "5px", borderRadius: "8px",
    border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px",
    backgroundColor: "#ffffff", color: "#1e293b", outline: "none"
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
      <header style={{ textAlign: "center", marginBottom: "30px", padding: "20px", background: "#1e293b", color: "white", borderRadius: "12px" }}>
        <h1>AI 股票戰情室</h1>
        <p style={{ fontSize: "12px", opacity: 0.8 }}>新聞每小時自動同步更新</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <h3>🔍 投資參數</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>股票代碼</label>
              <input style={inputStyle} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            </div>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>預計持有期限</label>
              <select style={inputStyle} value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="short">短線 (1-2 週)</option>
                <option value="mid">中線 (1-3 個月)</option>
                <option value="long">長線 (半年以上)</option>
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>投資本金 (TWD)</label>
              <input type="number" style={inputStyle} value={principal} onChange={(e) => setPrincipal(e.target.value)} />
            </div>
            <button onClick={handleAnalyze} disabled={analyzing} style={{ width: "100%", padding: "14px", background: analyzing ? "#94a3b8" : "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              {analyzing ? "🚀 分析中..." : "開始 AI 診斷"}
            </button>
          </section>

          {/* 新聞區塊 */}
          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", flex: 1 }}>
            <h3>📰 相關新聞</h3>
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              {newsList.map((n, i) => (
                <div key={i} style={{ padding: "10px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }} onClick={() => window.open(n.url, "_blank")}>
                  <div style={{ fontSize: "12px", color: "#2563eb" }}>{n.tag}</div>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>{n.title}</div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{n.time}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 右側結果 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!analysisResult ? (
            <div style={{ height: "600px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: "12px", color: "#64748b", border: "2px dashed #cbd5e1" }}>
              請設定參數並點擊分析
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div style={{ background: "white", padding: "20px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                  <h2 style={{ fontSize: "48px", margin: "10px 0", color: "#2563eb" }}>{analysisResult.ai_score}</h2>
                  <p style={{ fontWeight: "bold" }}>綜合診斷：{analysisResult.ai_sentiment}</p>
                  
                  {/* 新增：投報分析區塊 */}
                  <div style={{ marginTop: "20px", padding: "15px", background: "#f0fdf4", borderRadius: "12px", textAlign: "left", border: "1px solid #bbf7d0" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#166534", display: "flex", alignItems: "center" }}>💰 預期持有投報 (模擬)</h4>
                    <div style={{ fontSize: "14px", color: "#1e293b" }}>預計購買：<b>{roiData?.shares}</b> 股</div>
                    <div style={{ fontSize: "14px", color: "#1e293b" }}>預測期末價：<b style={{color:"#166534"}}>${roiData?.targetPrice}</b></div>
                    <hr style={{ border: "0.5px solid #bbf7d0", margin: "10px 0" }} />
                    <div style={{ fontSize: "16px", fontWeight: "bold", color: roiData?.expectedProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                      預期損益：{roiData?.expectedProfit >= 0 ? "+" : ""}{roiData?.expectedProfit.toLocaleString()} TWD
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: roiData?.expectedProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                      預期投報率：{roiData?.roiPercentage}%
                    </div>
                  </div>
                </div>

                <div style={{ background: "white", padding: "10px", borderRadius: "12px", display: "flex", justifyContent: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <Radar name="評分" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 線圖 */}
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", height: "400px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                <h3 style={{ margin: "0 0 20px 0" }}>📈 價格趨勢與預測 (持有期末點：${roiData?.targetPrice})</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={analysisResult.chart_data.history.concat(analysisResult.chart_data.prediction)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="#1e293b" strokeWidth={3} dot={false} name="歷史價" />
                    <Line type="monotone" dataKey="mid" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="AI預測" />
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
