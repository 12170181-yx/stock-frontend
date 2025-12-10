import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, Activity, BarChart2, PieChart, Newspaper, Zap, Search, ShieldCheck, Wifi, WifiOff, Target, RefreshCw, ExternalLink, HelpCircle, Star, Trash2, Bot, FileText, CheckCircle2, Wallet, PlusCircle, X, Database, Calculator, AlertTriangle, Scale, RotateCcw, Microscope } from 'lucide-react';

// ⚠️ 請確認這是您 Render 後端的網址
const API_BASE_URL = "https://stock-backend-g011.onrender.com"; 

// --- 介面與指標定義 ---
const ANALYSIS_CRITERIA = {
  fund: { 
    title: "基本面分析 (Fundamental)", 
    icon: PieChart, 
    color: "text-blue-600", 
    bgColor: "bg-blue-50",
    desc: "評估公司真實價值與長期競爭力",
    items: [
      { label: "營收、獲利 (EPS)", desc: "每股盈餘成長率與營收動能" },
      { label: "利潤率分析", desc: "毛利率 / 營業利益率 / 淨利率" },
      { label: "經營績效 (ROE/ROA)", desc: "股東權益報酬率" },
      { label: "本益比 (PE)", desc: "股價估值是否合理" }
    ]
  },
  tech: { 
    title: "技術面分析 (Technical)", 
    icon: TrendingUp, 
    color: "text-purple-600", 
    bgColor: "bg-purple-50", 
    desc: "透過量價走勢判斷進出場時機",
    items: [
      { label: "RSI 相對強弱", desc: "判斷超買(>70)或超賣(<30)" },
      { label: "MACD 指標", desc: "趨勢強弱與多空轉折" },
      { label: "均線系統 (MA)", desc: "5日/20日/60日線排列" },
      { label: "布林通道", desc: "股價波動範圍與壓縮突破" },
      { label: "KD 隨機指標", desc: "短線轉折訊號" }
    ]
  },
  chip: { 
    title: "籌碼面分析 (Chip Flow)", 
    icon: BarChart2, 
    color: "text-orange-600", 
    bgColor: "bg-orange-50", 
    desc: "追蹤主力大戶與法人的資金動向",
    items: [
      { label: "三大法人買賣超", desc: "外資、投信、自營商" },
      { label: "成交量能", desc: "量價關係分析" }
    ]
  },
  news: { 
    title: "消息面分析 (Sentiment)", 
    icon: Newspaper, 
    color: "text-green-600", 
    bgColor: "bg-green-50", 
    desc: "解讀市場情緒與新聞",
    items: [
      { label: "重大新聞", desc: "財報、法說會、產品發表" },
      { label: "市場情緒", desc: "恐懼與貪婪指數" }
    ]
  }
};

const STRATEGIES = {
  none: { label: '無 (不限)', allowedPeriods: ['short', 'mid', 'long'], risk: 'neutral' },
  day_trade: { label: '⚡ 當沖 (極短)', allowedPeriods: ['short'], risk: 'aggressive' },
  swing: { label: '🌊 波段 (趨勢)', allowedPeriods: ['short', 'mid'], risk: 'neutral' },
  bottom: { label: '🎣 抄底 (反彈)', allowedPeriods: ['mid', 'long'], risk: 'aggressive' },
  value: { label: '🐢 存股 (長期)', allowedPeriods: ['long'], risk: 'conservative' }
};

// --- 工具函數 ---
const getTaiwanDateString = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const twTime = new Date(utc + (3600000 * 8));
  return twTime.toISOString().slice(0, 10);
};

// --- [備援] 穩定模擬數據 (當後端掛掉時使用) ---
const generateStableMockData = (ticker) => {
  const t = ticker.toUpperCase();
  let seed = 0;
  for (let i = 0; i < t.length; i++) seed = (seed << 5) - seed + t.charCodeAt(i);
  
  const pseudoRandom = (offset) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const basePrice = (t.includes('2330') || t.includes('TSM')) ? 1000 : 100 + Math.floor(pseudoRandom(1) * 500);
  const history = Array.from({length: 60}, (_, i) => ({
    date: `D-${60-i}`,
    price: basePrice * (1 + (pseudoRandom(i) - 0.5) * 0.1),
    type: 'history'
  }));
  const lastPrice = history[history.length-1].price;

  const tech = 60 + Math.floor(pseudoRandom(2) * 30);
  const fund = 60 + Math.floor(pseudoRandom(3) * 30);
  const chip = 60 + Math.floor(pseudoRandom(4) * 30);
  const news = 60 + Math.floor(pseudoRandom(5) * 30);
  const total = Math.round(tech*0.4 + fund*0.2 + chip*0.2 + news*0.2);

  return {
    ticker,
    current_price: lastPrice.toFixed(2),
    total_score: total, // 修正為 total_score 以符合後端命名
    evaluation: total > 70 ? "強勢" : "整理",
    recommendation: "持有",
    scores: { tech, fund, chip, news },
    techDetails: { 
      rsi: 50 + Math.floor(pseudoRandom(6) * 20),
      ma20: lastPrice.toFixed(2),
      kVal: 50
    },
    chartData: {
        history_date: history.map(h => h.date),
        history_price: history.map(h => h.price),
        future_date: [],
        future_mean: []
    },
    news_list: [
        { title: "備援新聞：伺服器連線逾時", publisher: "System", link: "#" },
        { title: "請稍後再試以取得真實數據", publisher: "System", link: "#" }
    ],
    historyEndIndex: 59,
    source: 'simulation',
    missingSources: [],
    completeness: 100,
    // 補上缺少的欄位以符合 Full Features 介面
    strategy: {
        entry: lastPrice.toFixed(2),
        take_profit: (lastPrice * 1.1).toFixed(2),
        stop_loss: (lastPrice * 0.9).toFixed(2)
    },
    roi: { "1d": 1.2, "1w": 3.5, "1m": 5.2, "1y": 12.8 },
    risk: { max_loss_est: 5000, var_95_pct: 3.2 },
    patterns: ["模擬訊號"]
  };
};

// --- 真實技術指標運算 (前端即時計算) ---
const calcSMA = (data, period) => {
  if (data.length < period) return null;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
};

const calculateDetailedTechnicals = (prices) => {
  if (!prices || prices.length < 60) return null;

  // RSI
  let gains = 0, losses = 0;
  for (let i = prices.length - 14; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff; else losses += Math.abs(diff);
  }
  const rs = gains / (losses || 1);
  const rsi = 100 - (100 / (1 + rs));

  // Bollinger Bands
  const sma20 = calcSMA(prices, 20);
  const slice20 = prices.slice(-20);
  const variance = slice20.reduce((acc, val) => acc + Math.pow(val - sma20, 2), 0) / 20;
  const stdDev = Math.sqrt(variance);
  
  // KD (近似)
  const slice9 = prices.slice(-9);
  const high9 = Math.max(...slice9);
  const low9 = Math.min(...slice9);
  const rsv = (high9 === low9) ? 50 : ((prices[prices.length - 1] - low9) / (high9 - low9)) * 100;
  const kVal = (2/3) * 50 + (1/3) * rsv;

  return {
    rsi: Math.round(rsi),
    upperBand: (sma20 + 2 * stdDev).toFixed(2),
    lowerBand: (sma20 - 2 * stdDev).toFixed(2),
    ma20: sma20.toFixed(2),
    ma60: calcSMA(prices, 60).toFixed(2),
    kVal: Math.round(kVal),
    price: prices[prices.length - 1]
  };
};

// --- 核心 API 連線與重試機制 ---
const fetchWithRetry = async (payload, retries = 1) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); 

      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data; 
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
};

const fetchDepthAnalysis = async (ticker, principal, risk) => {
  const cleanTicker = ticker.toUpperCase();
  const twDate = getTaiwanDateString();
  const cacheKey = `stock_real_v16_fix_${cleanTicker}_${twDate}`; 
  
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) return { ...JSON.parse(cachedData), source: 'cached' };

  try {
    const data = await fetchWithRetry({ ticker, principal, risk });
    
    // --- 1. 技術面運算 ---
    const historyPrices = data.chart_data.history_price;
    const calcPrices = historyPrices.slice(-60); 
    const techDetails = calculateDetailedTechnicals(calcPrices);
    
    let techScore = 0;
    let isTechValid = false;

    if (techDetails) {
        let score = 50;
        if (techDetails.rsi > 70) score = 85;
        else if (techDetails.rsi < 30) score = 25;
        else score = 50 + (techDetails.rsi - 50) * 0.5;
        
        if (Number(techDetails.price) > Number(techDetails.ma20)) score += 10;
        if (Number(techDetails.ma20) > Number(techDetails.ma60)) score += 10;
        techScore = Math.min(99, Math.max(1, Math.round(score)));
        isTechValid = true;
    }

    // --- 2. 其他面向 ---
    const backendDetails = data.details || {};
    const getRealScore = (val) => (!isNaN(Number(val)) && Number(val) > 0) ? Number(val) : null;

    const fundVal = getRealScore(backendDetails.fund);
    const chipVal = getRealScore(backendDetails.chip);
    const newsVal = getRealScore(backendDetails.news);

    // --- 3. 總分 ---
    let totalScoreSum = 0;
    let totalWeight = 0;

    if (isTechValid) {
      totalScoreSum += techScore * 0.4;
      totalWeight += 0.4;
    }
    if (fundVal !== null) {
      totalScoreSum += fundVal * 0.2;
      totalWeight += 0.2;
    }
    if (chipVal !== null) {
      totalScoreSum += chipVal * 0.2;
      totalWeight += 0.2;
    }
    if (newsVal !== null) {
      totalScoreSum += newsVal * 0.2;
      totalWeight += 0.2;
    }

    const finalScore = totalWeight > 0 ? Math.round(totalScoreSum / totalWeight) : 0;

    let missingSources = [];
    if (fundVal === null) missingSources.push('基本');
    if (chipVal === null) missingSources.push('籌碼');
    if (newsVal === null) missingSources.push('消息');

    const result = {
      ...data,
      total_score: finalScore, // 統一欄位名稱
      scores: { tech: techScore, fund: fundVal || 0, chip: chipVal || 0, news: newsVal || 0 },
      missingSources,
      techDetails,
      dataDate: twDate,
      currentPrice: data.current_price,
      recPeriod: data.recommendation,
      news_list: data.news_list || [],
      chartData: {
          ...data.chart_data,
          history_price: data.chart_data.history_price,
          history_date: data.chart_data.history_date
      },
      historyEndIndex: data.chart_data.history_date.length - 1,
      // 確保 strategy 結構存在 (後端若無回傳則補預設)
      strategy: data.strategy || {
          entry: data.current_price,
          stop_loss: data.current_price * 0.9,
          take_profit: data.current_price * 1.1
      },
      roi: data.roi || { "1d": 0, "1w": 0, "1m": 0, "1y": 0 },
      risk: data.risk || { max_loss_est: 0, var_95_pct: 0 },
      patterns: data.patterns || []
    };

    if (isTechValid) {
        try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) {}
    }

    return { ...result, source: 'real' };

  } catch (e) {
    console.warn("後端連線失敗，啟動備援模式", e);
    return generateStableMockData(cleanTicker);
  }
};

const fetchRanking = async (strategy) => {
  try {
    const res = await fetch(`${API_BASE_URL}/rankings`);
    if(!res.ok) throw new Error();
    const data = await res.json();
    return data; 
  } catch (e) {
    return [];
  }
};

// --- Modal Component ---
const DetailModal = ({ aspectKey, data, onClose }) => {
  if (!aspectKey || !data) return null;
  const config = ANALYSIS_CRITERIA[aspectKey];
  const score = data.scores[aspectKey];
  const isTech = aspectKey === 'tech';
  const techDetails = data.techDetails || {};

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up" onClick={e=>e.stopPropagation()}>
        <div className={`p-4 border-b flex justify-between items-center ${config.bgColor}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-white ${config.color}`}>
              <config.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-bold ${config.color}`}>{config.title}</h3>
              <p className="text-xs text-gray-500 opacity-80">{config.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
          <div className="text-sm text-gray-400 font-bold mb-1">面向評分</div>
          {score > 0 ? (
            <div className={`text-5xl font-black ${score >= 70 ? 'text-green-600' : (score <= 40 ? 'text-red-500' : 'text-yellow-500')}`}>
              {score}
              <span className="text-sm font-normal text-gray-400 ml-1">/ 100</span>
            </div>
          ) : (
            <div className="text-3xl font-bold text-gray-400 py-2">無數據</div>
          )}
          
          {isTech && techDetails && (
            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="bg-white px-3 py-1 rounded border border-gray-200 shadow-sm">
                <span className="text-gray-400 block">RSI (14)</span>
                <span className="font-bold text-gray-700">{techDetails.rsi}</span>
              </div>
              <div className="bg-white px-3 py-1 rounded border border-gray-200 shadow-sm">
                <span className="text-gray-400 block">MA (20)</span>
                <span className="font-bold text-gray-700">{techDetails.ma20}</span>
              </div>
              <div className="bg-white px-3 py-1 rounded border border-gray-200 shadow-sm">
                <span className="text-gray-400 block">KD (K值)</span>
                <span className="font-bold text-gray-700">{techDetails.kVal}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
          <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider px-2">
            詳細觀察項目 (Analysis Breakdown)
          </h4>
          <div className="space-y-2">
            {config.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                <div className="mt-1">
                  <CheckCircle2 className={`w-4 h-4 ${score >= 60 ? 'text-green-500' : 'text-gray-300'}`} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    {item.label}
                    {score > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${score >= 70 ? 'bg-green-100 text-green-700' : (score <= 40 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500')}`}>
                        {score >= 70 ? '優良' : (score <= 40 ? '偏弱' : '中性')}
                        </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub Components ---
const AspectsGrid = ({ scores, ticker, onAspectClick }) => {
  const getScoreColor = (s) => s >= 70 ? 'text-green-600' : (s > 0 && s <= 40 ? 'text-red-600' : (s === 0 ? 'text-gray-400' : 'text-yellow-600'));
  const getBgHover = (s) => s >= 70 ? 'hover:bg-green-50 hover:border-green-200' : (s > 0 && s <= 40 ? 'hover:bg-red-50 hover:border-red-200' : 'hover:bg-yellow-50 hover:border-yellow-200');

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {Object.entries(ANALYSIS_CRITERIA).map(([key, config]) => (
        <div 
          key={key}
          onClick={() => onAspectClick(key)}
          className={`bg-white p-3 rounded-xl border border-gray-100 transition-all cursor-pointer shadow-sm hover:shadow-md hover:border-blue-300 group relative overflow-hidden`}
        >
          <div className={`absolute top-0 right-0 p-1 bg-gray-50 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity`}>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 flex items-center gap-1">
              <config.icon className="w-3.5 h-3.5" />
              {config.title.split(' ')[0]}
            </span>
          </div>
          <div className="flex items-end justify-between">
            <div className={`text-2xl font-bold leading-none ${getScoreColor(scores[key])}`}>
              {scores[key] > 0 ? scores[key] : '--'}
            </div>
            <div className="text-[10px] text-gray-400 font-medium">點擊查看詳情</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [formData, setFormData] = useState({ 
    ticker: '', 
    principal: 100000, 
    risk: 'neutral', 
    strategy: 'none', 
    period: 'mid' 
  });
  
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rankingList, setRankingList] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('rank');
  
  // Modal State
  const [selectedAspect, setSelectedAspect] = useState(null);

  useEffect(() => {
    const savedWatch = localStorage.getItem('myWatchlist');
    if (savedWatch) setWatchlist(JSON.parse(savedWatch));
    const savedPort = localStorage.getItem('myPortfolio');
    if (savedPort) setPortfolio(JSON.parse(savedPort));
    fetchRanking('growth').then(setRankingList);
  }, []);

  const handleAnalyze = async (tickerOverride) => {
    const targetTicker = tickerOverride || formData.ticker;
    if(!targetTicker) return;
    setLoading(true); setErrorMsg(''); setAnalysisResult(null); 
    try {
      const res = await fetchDepthAnalysis(targetTicker, formData.principal, formData.risk);
      setAnalysisResult(res);
    } catch (e) {
      console.error(e);
      setErrorMsg("伺服器連線失敗或資料不足，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchlist = (t) => {
    const clean = t.toUpperCase();
    const newList = watchlist.includes(clean) ? watchlist.filter(x => x !== clean) : [...watchlist, clean];
    setWatchlist(newList);
    localStorage.setItem('myWatchlist', JSON.stringify(newList));
  };
  
  const handleBuy = (trade) => {
    if (!confirm(`確定要模擬買進 ${trade.ticker} 嗎？`)) return;
    const newPortfolio = [...portfolio, { ...trade, date: new Date().toLocaleDateString() }];
    setPortfolio(newPortfolio);
    localStorage.setItem('myPortfolio', JSON.stringify(newPortfolio));
    setSidebarTab('portfolio');
  };
  
  const removePosition = (index) => {
    const newPortfolio = portfolio.filter((_, i) => i !== index);
    setPortfolio(newPortfolio);
    localStorage.setItem('myPortfolio', JSON.stringify(newPortfolio));
  };

  const isWatched = watchlist.includes(formData.ticker.toUpperCase());

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 p-4">
      {/* Detail Modal */}
      {selectedAspect && (
        <DetailModal 
          aspectKey={selectedAspect} 
          data={analysisResult} 
          onClose={() => setSelectedAspect(null)} 
        />
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" /> AI 全能投資戰情室 Pro
            </h1>
            {analysisResult && (
              <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${analysisResult.source === 'simulation' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {analysisResult.source === 'simulation' ? <AlertTriangle className="w-3 h-3"/> : <Wifi className="w-3 h-3"/>}
                {analysisResult.source === 'simulation' ? '離線模擬中' : '連線正常'}
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-500 mb-1">股票代碼</label>
                <div className="relative flex items-center gap-2">
                  <div className="relative w-full">
                    <input 
                      type="text" 
                      value={formData.ticker}
                      onChange={e => setFormData({...formData, ticker: e.target.value})}
                      placeholder="如 2330.TW, NVDA"
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold"
                      onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <button onClick={() => toggleWatchlist(formData.ticker)} className={`p-2 rounded-lg border ${isWatched ? 'bg-yellow-50 text-yellow-500' : 'bg-gray-50 text-gray-400'}`}>
                    <Star className={`w-5 h-5 ${isWatched ? 'fill-yellow-500' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 mb-1">本金 (TWD)</label>
                <input type="number" value={formData.principal} onChange={e => setFormData({...formData, principal: Number(e.target.value)})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 mb-1">策略</label>
                <select value={formData.strategy} onChange={e => setFormData({...formData, strategy: e.target.value})} className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm">
                  {Object.entries(STRATEGIES).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <button 
                  onClick={() => handleAnalyze()}
                  disabled={loading}
                  className={`w-full font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                >
                  {loading ? <RefreshCw className="animate-spin w-4 h-4"/> : <Zap className="w-4 h-4"/>}
                  {loading ? '分析' : '開始'}
                </button>
              </div>
            </div>
          </div>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-8 rounded-xl flex flex-col items-center justify-center gap-3 animate-pulse">
              <Microscope className="w-8 h-8 animate-bounce" />
              <div className="font-bold">AI 正在進行深度分析...</div>
              <div className="text-xs opacity-70">正在計算 RSI, MACD, 與布林通道...</div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
              <WifiOff className="w-6 h-6 shrink-0" />
              <div><div className="font-bold">發生錯誤</div><div className="text-sm">{errorMsg}</div></div>
            </div>
          )}

          {analysisResult && !loading && (
            <div className="space-y-6 animate-fade-in-up">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative">
                  <span className="text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">AI 綜合評分</span>
                  <div className={`text-6xl font-black ${analysisResult.total_score>=70?'text-green-600':(analysisResult.total_score<=40?'text-red-500':'text-yellow-500')}`}>
                    {analysisResult.total_score}
                  </div>
                  <div className="mt-2 text-sm font-bold text-gray-800">{analysisResult.evaluation}</div>
                </div>
                {/* 簡單的 ROI 區塊 */}
                <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-around">
                   <div className="text-center"><div className="text-xs text-gray-400">目前股價</div><div className="text-2xl font-bold">${analysisResult.currentPrice}</div></div>
                   <div className="text-center"><div className="text-xs text-gray-400">建議操作</div><div className="text-xl font-bold text-blue-600">{analysisResult.recPeriod}</div></div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white p-4 rounded-2xl shadow-sm h-64 border border-gray-100">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analysisResult.chartData.history_date.map((d,i)=>({date:d, price:analysisResult.chartData.history_price[i]}))}>
                       <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                       <XAxis dataKey="date" hide/>
                       <YAxis domain={['auto','auto']} hide/>
                       <Tooltip/>
                       <Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#g)" strokeWidth={2}/>
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
              
              {/* Aspects Grid */}
              <div>
                 <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2 px-1"><Target className="w-4 h-4 text-blue-600"/> 深度面向分析 <span className="text-xs font-normal text-gray-400">(點擊卡片查看詳細指標)</span></h3>
                 <AspectsGrid 
                    scores={analysisResult.scores} 
                    ticker={analysisResult.ticker} 
                    onAspectClick={setSelectedAspect} 
                 />
              </div>

              {/* News */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-purple-500" />
                  {analysisResult.ticker} 最新真實新聞
                </h3>
                <div className="space-y-3">
                  {analysisResult.news_list && analysisResult.news_list.length > 0 ? (
                    analysisResult.news_list.map((news, i) => (
                      <a key={i} href={news.link} target="_blank" rel="noreferrer" className="block p-3 border rounded-lg hover:shadow-md transition-all text-decoration-none">
                        <div className="text-sm font-bold text-gray-800 line-clamp-1">{news.title}</div>
                        <div className="text-xs text-gray-400 mt-1 flex justify-between">
                          <span>{news.publisher}</span>
                          <span><ExternalLink size={12}/></span>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 text-sm">暫無相關新聞</div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
             {/* Sidebar Tabs */}
             <div className="flex border-b">
                 <button onClick={()=>setSidebarTab('rank')} className={`flex-1 py-3 text-sm font-bold ${sidebarTab==='rank'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400'}`}>排行</button>
                 <button onClick={()=>setSidebarTab('portfolio')} className={`flex-1 py-3 text-sm font-bold ${sidebarTab==='portfolio'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400'}`}>資產</button>
                 <button onClick={()=>setSidebarTab('watch')} className={`flex-1 py-3 text-sm font-bold ${sidebarTab==='watch'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400'}`}>自選</button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {/* 1. Ranking */}
               {sidebarTab === 'rank' && (
                   rankingList.length > 0 ? rankingList.map((item, i) => (
                       <div key={i} onClick={()=>handleAnalyze(item.ticker)} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                           <div className="flex items-center gap-3">
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold ${i<3?'bg-yellow-400':'bg-gray-300'}`}>{i+1}</div>
                               <div>
                                   <div className="font-bold text-gray-700">{item.ticker}</div>
                                   <div className="text-xs text-gray-400">${item.price}</div>
                               </div>
                           </div>
                           <div className={`font-bold ${item.score>=70?'text-green-600':'text-gray-600'}`}>{item.score}分</div>
                       </div>
                   )) : <div className="text-center text-gray-400 mt-10">排行載入中...</div>
               )}

               {/* 2. Portfolio */}
               {sidebarTab === 'portfolio' && (
                   portfolio.length > 0 ? portfolio.map((p, i) => (
                       <div key={i} className="p-3 border rounded-xl bg-gray-50 relative">
                           <div className="flex justify-between mb-1">
                               <span className="font-bold">{p.ticker}</span>
                               <span className="text-xs text-gray-500">{p.date}</span>
                           </div>
                           <div className="flex justify-between items-end">
                               <span className="text-xs text-gray-500">{p.shares}股 @ ${p.price}</span>
                               <span className="font-bold text-gray-700">${(p.price*p.shares).toLocaleString()}</span>
                           </div>
                           <button onClick={()=>removePosition(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><X size={14}/></button>
                       </div>
                   )) : <div className="text-center text-gray-400 mt-10 flex flex-col items-center"><Wallet className="w-8 h-8 mb-2 opacity-50"/>尚無持倉</div>
               )}

               {/* 3. Watchlist */}
               {sidebarTab === 'watch' && (
                   watchlist.length > 0 ? watchlist.map(t => (
                        <div key={t} onClick={()=>handleAnalyze(t)} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                            <span className="font-bold">{t}</span>
                            <button onClick={e=>{e.stopPropagation(); toggleWatchlist(t)}}><Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500"/></button>
                        </div>
                   )) : <div className="text-center text-gray-400 mt-10">尚無自選股</div>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
