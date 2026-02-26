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

  // --- 模擬投報計算邏輯 ---
  const calculateROI = () => {
    if (!analysisResult || !analysisResult.chart_data?.prediction) return null;
    
    const buyPrice = analysisResult.advice.buy_price;
    const predictionData = analysisResult.chart_data.prediction;
    const targetPrice = predictionData[predictionData.length - 1].mid;
    
    const shares = Math.floor(principal / buyPrice); // 預計可買股數
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
          // 移除 strategy 參數，對齊後端 Pydantic 的 AnalysisRequest
          duration: duration 
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "分析失敗");
      }
      
      const data = await res.json();
      setAnalysisResult(data);
      fetchNews(targetSymbol); // 分析成功後，將新聞關鍵字切換為該股票
    } catch (err) {
      alert(`⚠️ 發生錯誤: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const getRadarData = () => {
    if (!analysisResult) return [];
    const b = analysisResult.score_breakdown;
    return [
      { subject: "技術趨勢", score: b.technical }, // 配合後端新格式
      { subject: "基本估值", score: b.fundamental },
      { subject: "籌碼量能", score: b.chip },
      { subject: "消息動能", score: b.news },
    ];
  };

  // 新聞標籤顏色對應
  const getTagColor = (tag) => {
    if (tag === "風險") return { bg: "#fee2e2", text: "#ef4444" }; // 紅
    if (tag === "評論") return { bg: "#dcfce7", text: "#16a34a" }; // 綠
    return { bg: "#dbeafe", text: "#2563eb" }; // 藍 (預設/產業)
  };

  const inputStyle = {
    width: "100%", padding: "12px", marginTop: "5px", borderRadius: "8px",
    border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px",
    backgroundColor: "#ffffff", color: "#1e293b", outline: "none",
    appearance: "auto", cursor: "pointer"
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
      <header style={{ textAlign: "center", marginBottom: "30px", padding: "20px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: "0 0 10px 0", letterSpacing: "2px" }}>⚡ AI 量化多因子戰情室</h1>
        <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>結合動態體制切換與 CVaR 風險模型 • 新聞每小時自動同步</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
        
        {/* 左側：參數與新聞 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", zIndex: 10 }}>
            <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a" }}>🔍 量化參數設定</h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>標的代碼 (Yahoo Finance 格式)</label>
              <input 
                style={inputStyle}
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)} 
                placeholder="例如: 2330.TW 或 AAPL"
              />
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>預計持有期限</label>
              <select style={inputStyle} value={duration} onChange={(e) => setDuration(e.target.value)}>
                <option value="short">短線 (約 2 週預測)</option>
                <option value="mid">中線 (約 1 季預測)</option>
                <option value="long">長線 (半年以上預測)</option>
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>模擬投資本金 (TWD)</label>
              <input 
                type="number" style={inputStyle} value={principal} 
                onChange={(e) => setPrincipal(e.target.value)} 
              />
            </div>

            <button 
              onClick={handleAnalyze} disabled={analyzing}
              style={{ 
                width: "100%", padding: "14px", 
                background: analyzing ? "#94a3b8" : "#2563eb", color: "white", 
                border: "none", borderRadius: "8px", cursor: analyzing ? "not-allowed" : "pointer", 
                fontWeight: "bold", transition: "all 0.2s", boxShadow: analyzing ? "none" : "0 4px 6px rgba(37, 99, 235, 0.2)"
              }}
            >
              {analyzing ? "🧠 AI 模型運算中..." : "啟動多因子模型"}
            </button>
          </section>

          <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", flex: 1 }}>
            <h3 style={{ display: "flex", justifyContent: "space-between", marginTop: 0, color: "#0f172a" }}>
              📰 即時輿情
              {newsLoading && <small style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "normal" }}>🔄 同步中...</small>}
            </h3>
            <div style={{ maxHeight: "480px", overflowY: "auto", paddingRight: "5px" }}>
              {newsList.length > 0 ? (
                newsList.map((n, i) => {
                  const tagColors = getTagColor(n.tag);
                  return (
                    <div
                      key={i}
                      onClick={() => n.url && window.open(n.url, "_blank", "noopener,noreferrer")}
                      style={{ 
                        width: "100%", textAlign: "left", padding: "14px", marginBottom: "10px", 
                        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", 
                        cursor: "pointer", transition: "transform 0.1s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    >
                      <span style={{ 
                        display: "inline-block", fontSize: "10px", fontWeight: "bold", 
                        marginBottom: "6px", padding: "2px 6px", borderRadius: "4px",
                        backgroundColor: tagColors.bg, color: tagColors.text
                      }}>
                        {n.tag}
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b", marginBottom: "6px", lineHeight: "1.4" }}>{n.title}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{n.source} • {n.time}</div>
                    </div>
                  )
                })
              ) : (
                <p style={{ textAlign: "center", color: "#94a3b8", marginTop: "40px" }}>尚無新聞資料</p>
              )}
            </div>
          </section>
        </div>

        {/* 右側：分析結果圖表 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {!analysisResult ? (
            <div style={{ height: "100%", minHeight: "600px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: "12px", color: "#94a3b8", border: "2px dashed #cbd5e1", fontSize: "18px", fontWeight: "bold", letterSpacing: "1px" }}>
              等待模型參數輸入...
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                <div style={{ background: "white", padding: "24px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>AI 多因子綜合評分</div>
                  <h2 style={{ fontSize: "56px", margin: "5px 0", color: analysisResult.ai_score >= 60 ? "#2563eb" : "#dc2626" }}>
                    {analysisResult.ai_score}
                  </h2>
                  <p style={{ fontWeight: "bold", color: "#1e293b", fontSize: "16px", padding: "6px 12px", background: "#f1f5f9", display: "inline-block", borderRadius: "20px" }}>
                    市場體制：{analysisResult.ai_sentiment}
                  </p>
                  
                  <div style={{ marginTop: "20px", padding: "15px", background: "#eff6ff", borderRadius: "8px", textAlign: "left", border: "1px solid #bfdbfe" }}>
                    <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569", fontWeight: "bold", fontSize: "14px" }}>💡 建議進場價</span>
                      <span style={{ color: "#059669", fontWeight: "bold", fontSize: "15px" }}>${analysisResult.advice.buy_price.toLocaleString()}</span>
                    </div>
                    <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569", fontWeight: "bold", fontSize: "14px" }}>🚀 目標獲利價</span>
                      <span style={{ color: "#2563eb", fontWeight: "bold", fontSize: "15px" }}>${analysisResult.advice.take_profit.toLocaleString()}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#475569", fontWeight: "bold", fontSize: "14px" }}>🛡️ CVaR 停損價</span>
                      <span style={{ color: "#dc2626", fontWeight: "bold", fontSize: "15px" }}>${analysisResult.advice.stop_loss.toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ marginTop: "15px", padding: "15px", background: "#f8fafc", borderRadius: "8px", textAlign: "left", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: "#334155", marginBottom: "8px" }}>💰 模擬持倉期滿預估 (蒙地卡羅)</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                      <span>預估購買股數</span>
                      <span>{roiData?.shares.toLocaleString()} 股</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1" }}>
                      <span style={{ fontWeight: "bold", color: "#334155" }}>預期損益</span>
                      <span style={{ fontWeight: "bold", color: roiData?.expectedProfit >= 0 ? "#16a34a" : "#dc2626" }}>
                        {roiData?.expectedProfit >= 0 ? "+" : ""}{roiData?.expectedProfit.toLocaleString()} TWD ({roiData?.roiPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ background: "white", padding: "15px", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold", width: "100%", textAlign: "left", marginBottom: "-10px" }}>模型因子權重分布</div>
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData()}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fill: "#475569", fontWeight: "bold" }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="評分" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ background: "white", padding: "24px", borderRadius: "12px", height: "450px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 20px 0", color: "#0f172a" }}>📈 歷史回測與預測漫步 ({duration === "short" ? "14天" : duration === "mid" ? "60天" : "180天"})</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analysisResult.chart_data.history.concat(analysisResult.chart_data.prediction)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: "13px", fontWeight: "bold" }} 
                      labelStyle={{ color: "#64748b", marginBottom: "5px" }}
                    />
                    <Line type="monotone" dataKey="price" stroke="#0f172a" strokeWidth={2.5} dot={false} name="歷史實際價格" />
                    <Line type="monotone" dataKey="mid" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="5 5" dot={false} name="模型預測路徑" />
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
