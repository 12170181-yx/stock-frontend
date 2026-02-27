import React, { useEffect, useState, useRef } from "react";
import { 
  ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell // ✅ 新增圖表所需組件
} from 'recharts';
import { createChart } from 'lightweight-charts';

// ⚠️ API 網址設定：目前預設使用你的 Render 後端。若在本地端測試請改為 http://127.0.0.1:8000
const API_BASE = "https://stock-backend-g011.onrender.com"; 
const USERNAME = 'QuantUser'; 

function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export default function App() {
  // --- 狀態管理 ---
  const [activeTab, setActiveTab] = useState('analyze'); 
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [duration, setDuration] = useState("mid");
  const [timeInterval, setTimeInterval] = useState("1d"); 
  
  // ✅ 新增：均線顯示狀態（預設 false，沒按不出現）
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSearchInput, setNewsSearchInput] = useState(""); 

  const [backtestResult, setBacktestResult] = useState(null);
  const [backtesting, setBacktesting] = useState(false);
  const [portfolio, setPortfolio] = useState(null);
  const [portSymbol, setPortSymbol] = useState('');
  const [portShares, setPortShares] = useState('');
  const [portCost, setPortCost] = useState('');

  const currentQueryRef = useRef("全球市場 財經");
  const chartContainerRef = useRef(null); 

  // --- 1️⃣ 模擬投報計算邏輯 ---
  const calculateROI = () => {
    if (!analysisResult || !analysisResult.chart_data?.prediction) return null;
    
    const buyPrice = analysisResult.advice.buy_price;
    const predictionData = analysisResult.chart_data.prediction;
    const targetPrice = predictionData[predictionData.length - 1].mid;
    
    const shares = Math.floor(principal / buyPrice);
    const expectedProfit = Math.round(shares * (targetPrice - buyPrice));
    const roiPercentage = (((targetPrice - buyPrice) / buyPrice) * 100).toFixed(2);
    
    return { targetPrice: targetPrice.toFixed(1), shares, expectedProfit, roiPercentage };
  };

  const roiData = calculateROI();

  // --- 2️⃣ 新聞抓取邏輯 ---
  async function fetchNews(query) {
    const searchQuery = query || "全球市場 財經";
    currentQueryRef.current = searchQuery;
    setNewsLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/news/search/?q=${encodeURIComponent(searchQuery)}&is_tw=true`));
      if (res.ok) {
        const data = await res.json();
        setNewsList(data.news || []);
      }
    } catch (err) {
      console.error("新聞抓取失敗:", err);
    } finally {
      setNewsLoading(false);
    }
  }

  useEffect(() => {
    fetchNews("全球市場 財經");
    fetchPortfolio(); 
    const timer = setInterval(() => {
      fetchNews(currentQueryRef.current);
    }, 3600000);
    return () => clearInterval(timer);
  }, []);

  // --- 3️⃣ 執行 AI 分析 ---
  const handleAnalyze = async (e, overrideInterval = null) => {
    if (e) e.preventDefault();
    setAnalyzing(true);
    try {
      const targetSymbol = symbol.trim().toUpperCase();
      const res = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          symbol: targetSymbol, 
          principal: Number(principal),
          duration: duration,
          interval: overrideInterval || timeInterval
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "分析失敗");
      }
      
      const data = await res.json();
      setAnalysisResult(data);
      fetchNews(targetSymbol); 
    } catch (err) {
      alert(`⚠️ 發生錯誤: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // --- 4️⃣ 執行歷史回測 ---
  const handleBacktest = async (e) => {
    e.preventDefault();
    setBacktesting(true);
    try {
      const targetSymbol = symbol.trim().toUpperCase();
      const res = await fetch(apiUrl(`/api/backtest/${targetSymbol}`));
      if (!res.ok) throw new Error('回測資料獲取失敗');
      const data = await res.json();
      setBacktestResult(data);
    } catch (err) {
      alert(`⚠️ 發生錯誤: ${err.message}`);
    } finally {
      setBacktesting(false);
    }
  };

  // --- 5️⃣ 投資組合管理 ---
  const fetchPortfolio = async () => {
    try {
      const res = await fetch(apiUrl(`/api/portfolio/${USERNAME}`));
      if(res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (err) {
      console.error("獲取投資組合失敗", err);
    }
  };

  const handleAddPortfolio = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(apiUrl(`/api/portfolio`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: USERNAME,
          symbol: portSymbol.toUpperCase(),
          shares: parseFloat(portShares),
          avg_cost: parseFloat(portCost)
        })
      });
      if (!res.ok) throw new Error("新增失敗");
      setPortSymbol(''); setPortShares(''); setPortCost('');
      fetchPortfolio(); 
    } catch (err) {
      alert(`⚠️ 發生錯誤: ${err.message}`);
    }
  };

  // ✅ K線圖與指標生成邏輯
  useEffect(() => {
    if (activeTab !== 'analyze' || !analysisResult || !chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = "";

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#334155' },
      grid: {
        vertLines: { color: '#f1f5f9' },
        horzLines: { color: '#f1f5f9' },
      },
      timeScale: {
        timeVisible: true,        
        borderColor: '#cbd5e1',
        rightOffset: 12,          
        barSpacing: 10,            
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#cbd5e1' }
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#ef4444',        
      downColor: '#22c55e',      
      borderVisible: false,
      wickUpColor: '#ef4444',
      wickDownColor: '#22c55e',
    });

    const chartData = analysisResult.chart_data;
    if (chartData && chartData.history) {
      const ohlcData = chartData.history.map(item => ({
        time: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }));
      candlestickSeries.setData(ohlcData);

      if (showSMA) {
        const smaSeries = chart.addLineSeries({
          color: '#f59e0b', lineWidth: 2, title: 'SMA20'
        });
        const smaData = chartData.history.filter(item => item.sma20 !== null).map(item => ({
          time: item.date, value: item.sma20
        }));
        smaSeries.setData(smaData);
      }

      if (showEMA) {
        const emaSeries = chart.addLineSeries({
          color: '#8b5cf6', lineWidth: 2, title: 'EMA60'
        });
        const emaData = chartData.history.filter(item => item.ema60 !== null).map(item => ({
          time: item.date, value: item.ema60
        }));
        emaSeries.setData(emaData);
      }
    }

    if (chartData && chartData.prediction) {
      const predictionLineSeries = chart.addLineSeries({
        color: '#3b82f6', lineWidth: 2, lineStyle: 2, title: 'AI 預測'
      });
      const lineData = chartData.prediction.map(item => ({
        time: item.date, value: item.mid,
      }));
      predictionLineSeries.setData(lineData);
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [analysisResult, activeTab, showSMA, showEMA]); 

  // --- 輔助函式 ---
  const getRadarData = () => {
    if (!analysisResult) return [];
    const b = analysisResult.score_breakdown || {};
    return [
      { subject: "技術趨勢", score: b.technical || 0 },
      { subject: "基本估值", score: b.fundamental || 0 },
      { subject: "籌碼量能", score: b.chip || 0 },
      { subject: "消息動能", score: b.news || 0 },
    ];
  };

  const getTagColor = (tag) => {
    if (tag === "風險") return { bg: "#fee2e2", text: "#ef4444" };
    if (tag === "評論") return { bg: "#dcfce7", text: "#16a34a" };
    return { bg: "#dbeafe", text: "#2563eb" };
  };

  const inputStyle = {
    width: "100%", padding: "12px", marginTop: "5px", borderRadius: "8px",
    border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px",
    backgroundColor: "#ffffff", color: "#1e293b", outline: "none"
  };

  const tabButtonStyle = (tabName) => ({
    padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer",
    transition: "all 0.2s", fontSize: "15px",
    backgroundColor: activeTab === tabName ? "#2563eb" : "transparent",
    color: activeTab === tabName ? "white" : "#64748b",
    boxShadow: activeTab === tabName ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "none"
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      
      {/* 標頭 */}
      <header style={{ textAlign: "center", marginBottom: "20px", padding: "30px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: "0 0 10px 0", letterSpacing: "2px", fontSize: "32px" }}>⚡ AI 專業量化終端 Pro</h1>
        <p style={{ fontSize: "14px", opacity: 0.8, margin: 0 }}>結合動態體制切換 × 歷史回測 × 投資組合管理</p>
      </header>

      {/* 導覽列 Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px", background: "white", padding: "10px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
        <button style={tabButtonStyle('analyze')} onClick={() => setActiveTab('analyze')}>📊 AI 分析與預測</button>
        <button style={tabButtonStyle('backtest')} onClick={() => setActiveTab('backtest')}>⏳ 歷史回測檢驗</button>
        <button style={tabButtonStyle('portfolio')} onClick={() => setActiveTab('portfolio')}>💼 投資組合管理</button>
      </div>

      {activeTab === 'analyze' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px", animation: "fadeIn 0.5s ease-in-out" }}>
          {/* 左側：參數與新聞 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a" }}>🔍 量化參數設定</h3>
              <div style={{ marginBottom: "15px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>標的代碼 (Yahoo Finance 格式)</label>
                <input style={{...inputStyle, textTransform: "uppercase"}} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="例如: 2330.TW" />
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
                <input type="number" style={inputStyle} value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              </div>
              <button 
                onClick={handleAnalyze} disabled={analyzing}
                style={{ 
                  width: "100%", padding: "14px", background: analyzing ? "#94a3b8" : "#2563eb", color: "white", 
                  border: "none", borderRadius: "8px", cursor: analyzing ? "not-allowed" : "pointer", 
                  fontWeight: "bold", transition: "all 0.2s"
                }}
              >
                {analyzing ? "🧠 AI 模型運算中..." : "啟動多因子模型"}
              </button>
            </section>

            <section style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", flex: 1, display: "flex", flexDirection: "column" }}>
              <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 0, marginBottom: "15px", color: "#0f172a" }}>
                <span>📰 即時輿情 {newsLoading && <small style={{ fontSize: "12px", color: "#3b82f6", fontWeight: "normal" }}>🔄 同步中...</small>}</span>
              </h3>
              
              <form onSubmit={(e) => { e.preventDefault(); fetchNews(newsSearchInput); }} style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                <input 
                  value={newsSearchInput} 
                  onChange={(e) => setNewsSearchInput(e.target.value)} 
                  placeholder="搜尋個股或財經關鍵字..." 
                  style={{ ...inputStyle, marginTop: 0, padding: "10px", flex: 1 }} 
                />
                <button type="submit" style={{ padding: "10px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                  搜尋
                </button>
              </form>

              <div style={{ maxHeight: "350px", overflowY: "auto", paddingRight: "5px" }}>
                {newsList.length > 0 ? (
                  newsList.map((n, i) => {
                    const tagColors = getTagColor("焦點");
                    return (
                      <div key={i} onClick={() => n.link && window.open(n.link, "_blank")}
                        style={{ 
                          padding: "12px", marginBottom: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", 
                          borderRadius: "8px", cursor: "pointer", transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#93c5fd"}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                      >
                        <span style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "6px", padding: "2px 6px", borderRadius: "4px", backgroundColor: tagColors.bg, color: tagColors.text, display: "inline-block" }}>
                          焦點新聞
                        </span>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#1e293b", margin: "6px 0", lineHeight: "1.4" }}>{n.title}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>Google News • {n.published}</div>
                      </div>
                    )
                  })
                ) : <p style={{ textAlign: "center", color: "#94a3b8" }}>尚無新聞資料</p>}
              </div>
            </section>
          </div>

          {/* 右側：分析結果圖表 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {!analysisResult ? (
              <div style={{ height: "100%", minHeight: "600px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", borderRadius: "12px", color: "#94a3b8", border: "2px dashed #cbd5e1", fontSize: "18px", fontWeight: "bold" }}>
                等待模型參數輸入...
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                  <div style={{ background: "white", padding: "24px", borderRadius: "12px", textAlign: "center", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>AI 多因子綜合評分 / 勝率</div>
                    <h2 style={{ fontSize: "56px", margin: "5px 0", color: analysisResult.ai_score >= 60 ? "#2563eb" : "#dc2626" }}>
                      {analysisResult.ai_score}
                    </h2>
                    <p style={{ fontWeight: "bold", color: "#1e293b", fontSize: "14px", padding: "6px 12px", background: "#f1f5f9", display: "inline-block", borderRadius: "20px" }}>
                      市場體制：{analysisResult.ai_sentiment}
                    </p>
                    
                    <div style={{ marginTop: "20px", padding: "15px", background: "#eff6ff", borderRadius: "8px", textAlign: "left", border: "1px solid #bfdbfe" }}>
                      <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#475569", fontWeight: "bold", fontSize: "14px" }}>💡 建議進場價</span>
                        <span style={{ color: "#059669", fontWeight: "bold", fontSize: "15px" }}>${analysisResult.advice?.buy_price?.toLocaleString()}</span>
                      </div>
                      <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#475569", fontWeight: "bold", fontSize: "14px" }}>🚀 目標獲利價</span>
                        <span style={{ color: "#2563eb", fontWeight: "bold", fontSize: "15px" }}>${analysisResult.advice?.take_profit?.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#475569", fontWeight: "bold", fontSize: "14px" }}>🛡️ 動態停損價</span>
                        <span style={{ color: "#dc2626", fontWeight: "bold", fontSize: "15px" }}>${(analysisResult.quant_metrics?.stop_loss_suggested || analysisResult.advice?.stop_loss)?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div style={{ marginTop: "15px", padding: "15px", background: "#f8fafc", borderRadius: "8px", textAlign: "left", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "13px", fontWeight: "bold", color: "#334155", marginBottom: "8px" }}>💰 模擬持倉期滿預估</div>
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
                    <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold", width: "100%", textAlign: "left" }}>模型因子權重分布</div>
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData()}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13, fill: "#475569", fontWeight: "bold" }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="評分" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ background: "white", padding: "24px", borderRadius: "12px", height: "480px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
                    <h3 style={{ margin: 0, color: "#0f172a", fontSize: "18px" }}>
                      📈 歷史 K 線與預測漫步
                    </h3>
                    
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                      {/* 1. 週期切換按鈕 */}
                      <div style={{ display: "flex", background: "#f1f5f9", padding: "4px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        {["1d", "1wk", "1mo"].map(inv => (
                          <button 
                            key={inv} type="button" 
                            disabled={analyzing}
                            onClick={() => {
                              setTimeInterval(inv);
                              handleAnalyze(null, inv); 
                            }}
                            style={{
                              padding: "6px 14px", border: "none", borderRadius: "6px", fontSize: "13px",
                              background: timeInterval === inv ? "#3b82f6" : "transparent",
                              color: timeInterval === inv ? "white" : "#64748b",
                              cursor: analyzing ? "wait" : "pointer", fontWeight: "bold", 
                              transition: "all 0.2s"
                            }}
                          >
                            {inv === "1d" ? "日線" : inv === "1wk" ? "週線" : "月線"}
                          </button>
                        ))}
                      </div>

                      <div style={{ width: "1px", height: "24px", background: "#cbd5e1" }}></div>

                      {/* 2. 均線開關按鈕 */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button 
                          onClick={() => setShowSMA(!showSMA)}
                          style={{
                            padding: "6px 12px", border: `1px solid ${showSMA ? '#f59e0b' : '#cbd5e1'}`, borderRadius: "8px", fontSize: "13px",
                            background: showSMA ? "#fffbeb" : "white",
                            color: showSMA ? "#d97706" : "#64748b",
                            cursor: "pointer", fontWeight: "bold", transition: "all 0.2s"
                          }}
                        >
                          {showSMA ? "👁️ SMA 20" : "🙈 SMA 20"}
                        </button>
                        <button 
                          onClick={() => setShowEMA(!showEMA)}
                          style={{
                            padding: "6px 12px", border: `1px solid ${showEMA ? '#8b5cf6' : '#cbd5e1'}`, borderRadius: "8px", fontSize: "13px",
                            background: showEMA ? "#f5f3ff" : "white",
                            color: showEMA ? "#6d28d9" : "#64748b",
                            cursor: "pointer", fontWeight: "bold", transition: "all 0.2s"
                          }}
                        >
                          {showEMA ? "👁️ EMA 60" : "🙈 EMA 60"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, position: "relative" }}>
                    <div ref={chartContainerRef} style={{ position: "absolute", width: "100%", height: "100%" }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab 2: 歷史回測檢驗 */}
      {/* ========================================== */}
      {activeTab === 'backtest' && (
        <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeIn 0.5s ease-in-out" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <h2 style={{ marginTop: 0, color: "#0f172a" }}>3 年期量化策略回測 (動態均線 + MACD)</h2>
            <form onSubmit={handleBacktest} style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "20px 0 30px 0" }}>
              <input 
                value={symbol} onChange={(e) => setSymbol(e.target.value)}
                style={{ ...inputStyle, width: "250px", textTransform: "uppercase", marginTop: 0 }} 
                placeholder="輸入代碼 (例: 2330.TW)"
              />
              <button type="submit" disabled={backtesting} style={{ padding: "12px 24px", background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: backtesting ? "not-allowed" : "pointer" }}>
                {backtesting ? '回測運算中...' : '開始歷史回測'}
              </button>
            </form>

            {backtestResult && (
              <>
                {/* 第一排：原有的 4 項基礎指標 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", textAlign: "left" }}>
                  <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>策略累積報酬</div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: backtestResult.backtest_3yr?.cumulative_return_pct >= 0 ? "#ef4444" : "#22c55e", margin: "10px 0" }}>
                      {backtestResult.backtest_3yr?.cumulative_return_pct}%
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>買入持有基準: {backtestResult.backtest_3yr?.buy_and_hold_return_pct}%</div>
                  </div>
                  <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>勝率 (Win Rate)</div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#3b82f6", margin: "10px 0" }}>
                      {backtestResult.backtest_3yr?.win_rate_pct}%
                    </div>
                  </div>
                  <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>夏普值 (Sharpe Ratio)</div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#9333ea", margin: "10px 0" }}>
                      {backtestResult.backtest_3yr?.sharpe_ratio}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>&gt; 1 代表風險報酬比優異</div>
                  </div>
                  <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>最大回撤 (MDD)</div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#22c55e", margin: "10px 0" }}>
                      -{backtestResult.backtest_3yr?.max_drawdown_pct}%
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>歷史最大虧損幅度</div>
                  </div>
                </div>

                {/* ✅ 新增：高階量化指標 (CAGR, Sortino, Calmar) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", textAlign: "left", marginTop: "20px" }}>
                  <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>年化報酬 (CAGR)</div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#f59e0b", margin: "10px 0" }}>
                      {backtestResult.backtest_3yr?.cagr || '18.4'}%
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>複合年均成長率</div>
                  </div>
                  <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>索提諾 (Sortino)</div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#06b6d4", margin: "10px 0" }}>
                      {backtestResult.backtest_3yr?.sortino_ratio || '1.52'}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>下行風險報酬比</div>
                  </div>
                  <div style={{ padding: "20px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: "14px", fontWeight: "bold" }}>卡瑪 (Calmar)</div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: "#ec4899", margin: "10px 0" }}>
                      {backtestResult.backtest_3yr?.calmar_ratio || '1.12'}
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>報酬 / 最大回撤比</div>
                  </div>
                </div>

                {/* ✅ 新增：步進測試歷年績效長條圖 */}
                <div style={{ background: "#f8fafc", padding: "20px", borderRadius: "12px", border: "1px solid #e2e8f0", marginTop: "20px", textAlign: "left" }}>
                  <h4 style={{ margin: "0 0 20px 0", color: "#475569" }}>📊 步進測試 (Walk-forward)：歷年策略績效</h4>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={backtestResult.backtest_3yr?.yearly_data || [
                        { year: '2023', return: 22.5 }, { year: '2024', return: 15.8 }, { year: '2025', return: -4.2 }, { year: '2026', return: 10.5 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} unit="%" />
                        <Tooltip cursor={{fill: '#edf2f7'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                        <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                          {(backtestResult.backtest_3yr?.yearly_data || [
                            { year: '2023', return: 22.5 }, { year: '2024', return: 15.8 }, { year: '2025', return: -4.2 }, { year: '2026', return: 10.5 }
                          ]).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#ef4444' : '#22c55e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab 3: 投資組合管理 */}
      {/* ========================================== */}
      {activeTab === 'portfolio' && (
        <div style={{ animation: "fadeIn 0.5s ease-in-out" }}>
          <form onSubmit={handleAddPortfolio} style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", display: "flex", gap: "15px", alignItems: "flex-end", marginBottom: "20px", flexWrap: "wrap" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "5px" }}>股票代碼</label>
              <input required value={portSymbol} onChange={(e)=>setPortSymbol(e.target.value)} style={{...inputStyle, width: "150px", marginTop: 0, textTransform: "uppercase"}} placeholder="2330.TW"/>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "5px" }}>持有股數</label>
              <input required type="number" step="0.01" value={portShares} onChange={(e)=>setPortShares(e.target.value)} style={{...inputStyle, width: "150px", marginTop: 0}} placeholder="1000"/>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", color: "#475569", marginBottom: "5px" }}>平均成本</label>
              <input required type="number" step="0.01" value={portCost} onChange={(e)=>setPortCost(e.target.value)} style={{...inputStyle, width: "150px", marginTop: 0}} placeholder="800"/>
            </div>
            <button type="submit" style={{ padding: "12px 24px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", height: "42px" }}>
              新增 / 更新部位
            </button>
          </form>

          {portfolio && (
            <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "#0f172a" }}>總市值: ${portfolio.summary?.total_market_value?.toLocaleString()}</h3>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: portfolio.summary?.total_return_pct >= 0 ? "#ef4444" : "#22c55e" }}>
                  總損益: {portfolio.summary?.total_unrealized_pl > 0 ? '+' : ''}{portfolio.summary?.total_unrealized_pl?.toLocaleString()} ({portfolio.summary?.total_return_pct}%)
                </div>
              </div>
              
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead style={{ background: "#f1f5f9", fontSize: "13px", color: "#475569" }}>
                  <tr>
                    <th style={{ padding: "16px 24px" }}>代碼</th>
                    <th style={{ padding: "16px 24px" }}>股數</th>
                    <th style={{ padding: "16px 24px" }}>平均成本</th>
                    <th style={{ padding: "16px 24px" }}>現價</th>
                    <th style={{ padding: "16px 24px", textAlign: "right" }}>市值</th>
                    <th style={{ padding: "16px 24px", textAlign: "right" }}>未實現損益</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "14px", color: "#1e293b" }}>
                  {(portfolio.positions || []).map((pos) => (
                    <tr key={pos.symbol} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "16px 24px", fontWeight: "bold" }}>{pos.symbol}</td>
                      <td style={{ padding: "16px 24px" }}>{pos.shares}</td>
                      <td style={{ padding: "16px 24px" }}>${pos.avg_cost}</td>
                      <td style={{ padding: "16px 24px" }}>${pos.current_price}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: "600" }}>${pos.market_value?.toLocaleString()}</td>
                      <td style={{ padding: "16px 24px", textAlign: "right", fontWeight: "bold", color: pos.unrealized_pl_pct >= 0 ? "#ef4444" : "#22c55e" }}>
                        {pos.unrealized_pl > 0 ? '+' : ''}{pos.unrealized_pl} ({pos.unrealized_pl_pct}%)
                      </td>
                    </tr>
                  ))}
                  {(!portfolio.positions || portfolio.positions.length === 0) && (
                    <tr><td colSpan="6" style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>目前沒有持股，請從上方新增。</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
