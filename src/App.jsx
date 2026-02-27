import React, { useEffect, useState, useRef } from "react";
import { 
  ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  AreaChart, Area, ComposedChart, Line // ✅ 新增高階圖表所需組件
} from 'recharts';
import { createChart } from 'lightweight-charts';

// API 網址設定
const API_BASE = "https://stock-backend-g011.onrender.com"; 
const USERNAME = 'QuantUser'; 

function apiUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}

export default function App() {
  // --- 狀態管理 ---
  const [activeTab, setActiveTab] = useState('analyze'); // 新增了 'ranking' Tab
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [duration, setDuration] = useState("mid");
  const [timeInterval, setTimeInterval] = useState("1d"); 
  
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

  // 🌟 假資料區 (等待後端 API 接上後替換) 🌟
  // 1️⃣ 因子貢獻透明化 (SHAP Values)
  const mockShapData = [
    { factor: "趨勢動能 (MACD/RSI)", value: 35, fill: "#ef4444" },
    { factor: "外資買賣超", value: 25, fill: "#ef4444" },
    { factor: "營收成長率", value: 18, fill: "#ef4444" },
    { factor: "乖離率過高", value: -12, fill: "#22c55e" },
    { factor: "總體經濟波動", value: -5, fill: "#22c55e" }
  ];

  // 2️⃣ 策略穩健性測試 (Rolling Window & Regime)
  const mockRollingSharpe = Array.from({ length: 24 }, (_, i) => ({
    month: `2024-${String(i % 12 + 1).padStart(2, '0')}`,
    sharpe: (Math.random() * 2 + 0.5).toFixed(2)
  }));
  const mockRegimeData = [
    { regime: "大盤多頭 (200MA之上)", winRate: 78, return: 25.4 },
    { regime: "大盤空頭 (200MA之下)", winRate: 45, return: -5.2 }
  ];

  // 3️⃣ 多標的橫向比較 (Ranking)
  const mockRankingData = [
    { rank: 1, symbol: "2330.TW", name: "台積電", score: 98, sector: "半導體", momentum: 95, value: 80, signal: "強烈買進" },
    { rank: 2, symbol: "2317.TW", name: "鴻海", score: 92, sector: "電子代工", momentum: 88, value: 90, signal: "買進" },
    { rank: 3, symbol: "2454.TW", name: "聯發科", score: 89, sector: "半導體", momentum: 91, value: 75, signal: "買進" },
    { rank: 4, symbol: "3231.TW", name: "緯創", score: 85, sector: "電腦周邊", momentum: 82, value: 85, signal: "買進" },
    { rank: 5, symbol: "2603.TW", name: "長榮", score: 45, sector: "航運", momentum: 30, value: 95, signal: "觀望" },
  ];

  // 4️⃣ 風險模型層 (Risk Modeling)
  const mockRiskMetrics = {
    beta: 1.15,
    var95: 3.2, // 95% Daily VaR
    cvar95: 4.5, // 95% Conditional VaR
    volatility: 28.5 // Annualized Volatility
  };

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

  // --- API 呼叫邏輯 (保留原有) ---
  async function fetchNews(query) { /* ...保留你原有的 fetchNews... */ }
  const handleAnalyze = async (e, overrideInterval = null) => { /* ...保留你原有的 handleAnalyze... */ 
    if (e) e.preventDefault();
    setAnalyzing(true);
    setTimeout(() => { // 假裝載入，讓你可以看到 UI
      setAnalysisResult({
        ai_score: 85, ai_sentiment: "多頭動能",
        advice: { buy_price: 800, take_profit: 950, stop_loss: 750 },
        chart_data: { history: [], prediction: [] }, // 簡化展示
        score_breakdown: { technical: 88, fundamental: 80, chip: 92, news: 75 }
      });
      setAnalyzing(false);
    }, 1500);
  };
  const handleBacktest = async (e) => { /* ...保留你原有的 handleBacktest... */ 
    e.preventDefault(); setBacktesting(true);
    setTimeout(() => { setBacktestResult({ mock: true }); setBacktesting(false); }, 1500);
  };
  const fetchPortfolio = async () => { /* ...保留... */ };
  const handleAddPortfolio = async (e) => { /* ...保留... */ };

  useEffect(() => { fetchPortfolio(); }, []);

  // --- 輔助樣式 ---
  const inputStyle = { width: "100%", padding: "12px", marginTop: "5px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box", fontSize: "14px", backgroundColor: "#ffffff", color: "#1e293b", outline: "none" };
  const tabButtonStyle = (tabName) => ({
    padding: "12px 24px", borderRadius: "8px", fontWeight: "bold", border: "none", cursor: "pointer", transition: "all 0.2s", fontSize: "15px",
    backgroundColor: activeTab === tabName ? "#2563eb" : "transparent", color: activeTab === tabName ? "white" : "#64748b",
    boxShadow: activeTab === tabName ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "none"
  });

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px", fontFamily: "sans-serif", backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      
      {/* 標頭 */}
      <header style={{ textAlign: "center", marginBottom: "20px", padding: "30px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "white", borderRadius: "12px" }}>
        <h1 style={{ margin: "0 0 10px 0", letterSpacing: "2px", fontSize: "32px" }}>⚡ AI 機構級量化終端 Pro</h1>
        <p style={{ fontSize: "14px", opacity: 0.8, margin: 0 }}>因子拆解 × 穩健性檢驗 × 橫向評分 × 風險矩陣</p>
      </header>

      {/* 導覽列 Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px", background: "white", padding: "10px", borderRadius: "12px", flexWrap: "wrap" }}>
        <button style={tabButtonStyle('analyze')} onClick={() => setActiveTab('analyze')}>📊 預測與因子拆解</button>
        <button style={tabButtonStyle('ranking')} onClick={() => setActiveTab('ranking')}>🌐 全市場策略雷達</button>
        <button style={tabButtonStyle('backtest')} onClick={() => setActiveTab('backtest')}>⏳ 穩健性與風險回測</button>
        <button style={tabButtonStyle('portfolio')} onClick={() => setActiveTab('portfolio')}>💼 投資組合管理</button>
      </div>

      {/* ========================================== */}
      {/* Tab 1: 預測與因子拆解 (Explainability 新增) */}
      {/* ========================================== */}
      {activeTab === 'analyze' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <section style={{ background: "white", padding: "20px", borderRadius: "12px" }}>
              <h3 style={{ marginTop: 0 }}>🔍 單一標的分析</h3>
              <input style={{...inputStyle, textTransform: "uppercase", marginBottom:"15px"}} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="例如: 2330.TW" />
              <button onClick={handleAnalyze} disabled={analyzing} style={{ width: "100%", padding: "14px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>
                {analyzing ? "🧠 AI 模型運算中..." : "啟動多因子模型"}
              </button>
            </section>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {analysisResult && (
              <>
                {/* 原本的綜合評分區 */}
                <div style={{ background: "white", padding: "24px", borderRadius: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold" }}>AI 多因子綜合評分</div>
                    <h2 style={{ fontSize: "56px", margin: "5px 0", color: "#2563eb" }}>{analysisResult.ai_score}</h2>
                    <p style={{ fontWeight: "bold", background: "#f1f5f9", display: "inline-block", padding: "6px 12px", borderRadius: "20px" }}>體制: {analysisResult.ai_sentiment}</p>
                  </div>
                  
                  {/* 🌟 核心模組 1: 因子貢獻透明化 (SHAP Feature Importance) 🌟 */}
                  <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "20px" }}>
                    <h4 style={{ margin: "0 0 10px 0", color: "#475569" }}>🔬 決策因子拆解 (SHAP 貢獻度)</h4>
                    <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "15px" }}>上漲機率 72%，具體由以下因子驅動：</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={mockShapData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="factor" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569' }} width={100} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                          {mockShapData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
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
      {/* 🌟 新增 Tab 2: 全市場策略雷達 (Cross-sectional Ranking) 🌟 */}
      {/* ========================================== */}
      {activeTab === 'ranking' && (
        <div style={{ animation: "fadeIn 0.5s ease-in-out" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, color: "#0f172a" }}>🏆 全市場量化選股雷達 (Top 100)</h2>
              <select style={{ ...inputStyle, width: "200px", marginTop: 0 }}>
                <option>依 AI 綜合評分排序</option>
                <option>依 動能因子 (Momentum) 排序</option>
                <option>依 價值因子 (Value) 排序</option>
              </select>
            </div>
            
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead style={{ background: "#f1f5f9", fontSize: "14px", color: "#475569" }}>
                <tr>
                  <th style={{ padding: "16px", borderRadius: "8px 0 0 8px" }}>排名</th>
                  <th style={{ padding: "16px" }}>代碼</th>
                  <th style={{ padding: "16px" }}>名稱</th>
                  <th style={{ padding: "16px" }}>產業板塊</th>
                  <th style={{ padding: "16px" }}>AI 評分</th>
                  <th style={{ padding: "16px" }}>動能因子</th>
                  <th style={{ padding: "16px" }}>價值因子</th>
                  <th style={{ padding: "16px", borderRadius: "0 8px 8px 0" }}>交易訊號</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "14px", color: "#1e293b" }}>
                {mockRankingData.map((row) => (
                  <tr key={row.symbol} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "16px", fontWeight: "bold", color: "#64748b" }}>#{row.rank}</td>
                    <td style={{ padding: "16px", fontWeight: "bold", color: "#2563eb", cursor: "pointer" }} onClick={() => { setSymbol(row.symbol); setActiveTab('analyze'); }}>{row.symbol}</td>
                    <td style={{ padding: "16px" }}>{row.name}</td>
                    <td style={{ padding: "16px" }}><span style={{ background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>{row.sector}</span></td>
                    <td style={{ padding: "16px", fontWeight: "bold", color: row.score > 90 ? "#ef4444" : "#1e293b" }}>{row.score}</td>
                    <td style={{ padding: "16px" }}>{row.momentum}</td>
                    <td style={{ padding: "16px" }}>{row.value}</td>
                    <td style={{ padding: "16px", fontWeight: "bold", color: row.signal.includes("買進") ? "#ef4444" : "#64748b" }}>{row.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* Tab 3: 穩健性與風險回測 (Robustness & Risk Modeling 新增) */}
      {/* ========================================== */}
      {activeTab === 'backtest' && (
        <div style={{ maxWidth: "1000px", margin: "0 auto", animation: "fadeIn 0.5s ease-in-out" }}>
          
          <form onSubmit={handleBacktest} style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "30px" }}>
             <input value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ ...inputStyle, width: "250px", textTransform: "uppercase", marginTop: 0 }} placeholder="輸入代碼 (例: 2330.TW)" />
             <button type="submit" style={{ padding: "12px 24px", background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold" }}>開始機構級回測</button>
          </form>

          {backtestResult && (
            <>
              {/* 🌟 核心模組 4: 風險模型層 (Risk Modeling) 🌟 */}
              <h3 style={{ color: "#0f172a", marginBottom: "15px" }}>🛡️ 機構級風險模型 (Risk Metrics)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "30px" }}>
                <div style={{ padding: "20px", background: "white", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #3b82f6" }}>
                  <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "bold" }}>系統風險 Beta</div>
                  <div style={{ fontSize: "28px", fontWeight: "900", color: "#1e293b", margin: "5px 0" }}>{mockRiskMetrics.beta}</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>相對大盤波動係數</div>
                </div>
                <div style={{ padding: "20px", background: "white", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #f59e0b" }}>
                  <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "bold" }}>預估年化波動率</div>
                  <div style={{ fontSize: "28px", fontWeight: "900", color: "#1e293b", margin: "5px 0" }}>{mockRiskMetrics.volatility}%</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>歷史日報標準差換算</div>
                </div>
                <div style={{ padding: "20px", background: "white", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #ef4444" }}>
                  <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "bold" }}>日 VaR (95%)</div>
                  <div style={{ fontSize: "28px", fontWeight: "900", color: "#ef4444", margin: "5px 0" }}>-{mockRiskMetrics.var95}%</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>單日最大預期虧損</div>
                </div>
                <div style={{ padding: "20px", background: "white", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #dc2626" }}>
                  <div style={{ color: "#64748b", fontSize: "13px", fontWeight: "bold" }}>極端風險 CVaR</div>
                  <div style={{ fontSize: "28px", fontWeight: "900", color: "#dc2626", margin: "5px 0" }}>-{mockRiskMetrics.cvar95}%</div>
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>超越 VaR 的平均虧損</div>
                </div>
              </div>

              {/* 🌟 核心模組 2: 策略穩健性測試 (Robustness) 🌟 */}
              
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <h4 style={{ margin: "0 0 20px 0", color: "#475569" }}>🔄 Rolling Window Test (252-day Sharpe)</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={mockRollingSharpe}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                      <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="sharpe" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <h4 style={{ margin: "0 0 20px 0", color: "#475569" }}>🐻 牛熊市分段績效 (Regime Analysis)</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={mockRegimeData} margin={{ top: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                      <XAxis dataKey="regime" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="return" name="平均報酬率(%)" radius={[4, 4, 0, 0]}>
                        {mockRegimeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.return > 0 ? '#ef4444' : '#22c55e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* Tab 4: 投資組合管理 (Portfolio) */}
      {/* ========================================== */}
      {activeTab === 'portfolio' && (
        <div style={{ animation: "fadeIn 0.5s ease-in-out" }}>
          {/* ...保留原本的 Portfolio 介面... */}
          <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>（保留原有投資組合介面）</div>
        </div>
      )}
    </div>
  );
}
