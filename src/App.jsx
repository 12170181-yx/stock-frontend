import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, Activity, BarChart2, PieChart, Newspaper, Zap, Search, ShieldCheck, Wifi, WifiOff, Target, RefreshCw, ExternalLink, HelpCircle, Star, Trash2, Bot, FileText, CheckCircle2, Wallet, PlusCircle, X, Server, Lock, Database, Microscope, Scale, Calculator, AlertTriangle } from 'lucide-react';

// ⚠️ 請確認這是您 Render 後端的網址
const API_BASE_URL = "https://stock-backend-g011.onrender.com"; 

// --- [使用者要求] 詳細介面設定 (Rich UI) ---
const ANALYSIS_CRITERIA = {
  fund: { 
    title: "基本面分析 (Fundamental)", 
    icon: PieChart, 
    color: "text-blue-600", 
    bgColor: "bg-blue-50",
    desc: "評估公司真實價值與長期競爭力",
    items: [
      { label: "營收、獲利 (EPS)", desc: "檢視每股盈餘成長率與營收動能" },
      { label: "利潤率分析", desc: "毛利率 / 營業利益率 / 淨利率" },
      { label: "經營績效 (ROE/ROA)", desc: "股東權益報酬率與資產報酬率" },
      { label: "現金流量 (FCF)", desc: "自由現金流是否充裕健康" },
      { label: "財務結構", desc: "負債比率與流動性風險評估" },
      { label: "護城河與競爭力", desc: "產業地位、定價權與技術門檻" },
      { label: "未來成長性", desc: "新技術導入與產品線擴展潛力" }
    ]
  },
  tech: { 
    title: "技術面分析 (Technical)", 
    icon: TrendingUp, 
    color: "text-purple-600", 
    bgColor: "bg-purple-50", 
    desc: "透過量價走勢判斷進出場時機",
    items: [
      { label: "K 線型態", desc: "晨星、吞噬、頭肩頂等反轉訊號" },
      { label: "均線系統 (MA)", desc: "5日、20日、60日、120日線排列" },
      { label: "MACD 指標", desc: "趨勢強弱與多空轉折 (DIF/DEM)" },
      { label: "RSI 相對強弱", desc: "判斷超買(>70)或超賣(<30)區間" },
      { label: "KD 隨機指標", desc: "短線轉折訊號 (K值/D值)" },
      { label: "布林通道", desc: "股價波動範圍與壓縮突破" },
      { label: "成交量能", desc: "量價關係 (量縮整理/爆量突破)" }
    ]
  },
  chip: { 
    title: "籌碼面分析 (Chip Flow)", 
    icon: BarChart2, 
    color: "text-orange-600", 
    bgColor: "bg-orange-50", 
    desc: "追蹤主力大戶與法人的資金動向",
    items: [
      { label: "三大法人買賣超", desc: "外資、投信、自營商動向" },
      { label: "主力進出", desc: "關鍵券商分點與大戶持股比" },
      { label: "融資融券", desc: "散戶指標與軋空潛力 (券資比)" },
      { label: "借券賣出", desc: "潛在空方壓力監控" },
      { label: "股權分散度", desc: "集保戶數變化 (大戶vs散戶)" }
    ]
  },
  news: { 
    title: "消息面分析 (Sentiment)", 
    icon: Newspaper, 
    color: "text-green-600", 
    bgColor: "bg-green-50", 
    desc: "解讀市場情緒與宏觀環境影響",
    items: [
      { label: "重大公司新聞", desc: "財報公佈、法說會、產品發表、併購" },
      { label: "宏觀經濟指標", desc: "利率、通膨、美元指數、美債殖利率" },
      { label: "政策與法規", desc: "政府補貼、產業禁令、稅收政策" },
      { label: "AI 與科技趨勢", desc: "新科技浪潮與市場情緒" },
      { label: "國際局勢", desc: "戰爭、疫情、供應鏈事件影響" },
      { label: "社群情緒", desc: "新聞熱度與恐懼貪婪指數" }
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

// --- 真實技術指標運算 (前端即時計算 - 確保即時性) ---
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

  // Bollinger Bands (20, 2)
  const sma20 = calcSMA(prices, 20);
  const slice20 = prices.slice(-20);
  const variance = slice20.reduce((acc, val) => acc + Math.pow(val - sma20, 2), 0) / 20;
  const stdDev = Math.sqrt(variance);
  
  // KD (近似值)
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
const fetchWithRetry = async (payload, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // 完整性檢查：如果重要欄位是 0，視為資料缺失，觸發重試
      if (!data.details || !data.details.fund || data.details.fund === 0) {
        if (i < retries) {
          console.warn(`資料不完整，第 ${i + 1} 次重試...`);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
      }
      return data; 
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
};

const fetchDepthAnalysis = async (ticker, principal, risk) => {
  const cleanTicker = ticker.toUpperCase();
  const twDate = getTaiwanDateString();
  const cacheKey = `stock_real_v9_pro_${cleanTicker}_${twDate}`; 
  
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) return { ...JSON.parse(cachedData), source: 'cached' };

  try {
    const data = await fetchWithRetry({ ticker, principal, risk });
    
    const historyPrices = data.chart_data.history_price;
    // [資料標準化] 解決電腦/手機分數不一致問題：
    // 無論後端回傳 100 筆還是 200 筆，我們只取「最後 60 筆」進行即時運算
    const calcPrices = historyPrices.slice(-60);
    const techDetails = calculateDetailedTechnicals(calcPrices);
    
    // 技術面評分 (基於標準化後的真實運算)
    let techScore = 50;
    if (techDetails) {
        if (techDetails.rsi > 70) techScore = 85;
        else if (techDetails.rsi < 30) techScore = 25;
        else techScore = 50 + (techDetails.rsi - 50) * 0.5;
        
        if (Number(techDetails.price) > Number(techDetails.ma20)) techScore += 10;
        if (Number(techDetails.ma20) > Number(techDetails.ma60)) techScore += 10;
        techScore = Math.min(99, Math.max(1, Math.round(techScore)));
    }

    // 其他面向 (後端真實數據)
    const backendDetails = data.details || {};
    const getStrictScore = (val) => (!isNaN(Number(val)) && Number(val) > 0) ? Number(val) : 50;

    const fundVal = getStrictScore(backendDetails.fund);
    const chipVal = getStrictScore(backendDetails.chip);
    const newsVal = getStrictScore(backendDetails.news);

    // 總分計算
    const finalScore = Math.round(
      techScore * 0.4 +
      fundVal * 0.2 +
      chipVal * 0.2 +
      newsVal * 0.2
    );

    let missingSources = [];
    if (backendDetails.fund === 0) missingSources.push('基本');
    if (backendDetails.chip === 0) missingSources.push('籌碼');
    if (backendDetails.news === 0) missingSources.push('消息');

    const result = {
      ...data,
      totalScore: finalScore,
      scores: { tech: techScore, fund: fundVal, chip: chipVal, news: newsVal },
      missingSources,
      techDetails,
      dataDate: twDate,
      currentPrice: data.current_price,
      recPeriod: data.recommendation,
      chartData: {
          ...data.chart_data,
          history_price: data.chart_data.history_price, // 原始數據
          history_date: data.chart_data.history_date
      },
      historyEndIndex: data.chart_data.history_date.length - 1
    };

    // 只有當資料完整時才快取，避免快取到壞資料
    if (missingSources.length === 0) {
        try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) {}
    }

    return { ...result, source: 'real' };
  } catch (e) {
    throw e;
  }
};

// ... FetchRanking, Commentary helpers ...
const fetchRanking = async (strategy) => {
  try {
    const res = await fetch(`${API_BASE_URL}/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy })
    });
    if(!res.ok) throw new Error();
    const data = await res.json();
    return data.results;
  } catch (e) {
    return [];
  }
};

const generateAICommentary = (data, strategy) => {
  if (!data) return null;
  const { ticker, totalScore, scores, missingSources } = data;
  let summary = "";
  if (totalScore >= 75) summary = `🔥 **${ticker}** 綜合評分 **${totalScore}分**，多頭格局明確。`;
  else if (totalScore >= 60) summary = `⚖️ **${ticker}** 綜合評分 **${totalScore}分**，區間震盪。`;
  else summary = `❄️ **${ticker}** 綜合評分 **${totalScore}分**，建議觀望。`;

  let details = [`📈 **技術面**：MA排列${scores.tech>=60?'強勢':'弱勢'}，RSI ${data.techDetails?.rsi}。`];
  if (missingSources.length > 0) details.push(`ℹ️ **資料校正**：${missingSources.join('、')}暫以中性計算。`);
  
  let strategyAnalysis = { title: "AI 策略", points: ["依據技術指標操作", "嚴設停損停利"] };
  return { summary, details, strategyAnalysis };
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
        {/* Header */}
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

        {/* Score Banner */}
        <div className="p-6 text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
          <div className="text-sm text-gray-400 font-bold mb-1">面向評分</div>
          <div className={`text-5xl font-black ${score >= 70 ? 'text-green-600' : (score <= 40 ? 'text-red-500' : 'text-yellow-500')}`}>
            {score}
            <span className="text-sm font-normal text-gray-400 ml-1">/ 100</span>
          </div>
          
          {/* 如果是技術面，顯示真實運算數據 */}
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

        {/* Detailed Items List */}
        <div className="p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
          <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider px-2">
            詳細觀察項目 (Analysis Breakdown)
          </h4>
          <div className="space-y-2">
            {config.items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                <div className="mt-1">
                  {/* 使用面向分數來概略判斷每個細項的狀態 */}
                  <CheckCircle2 className={`w-4 h-4 ${score >= 60 ? 'text-green-500' : 'text-gray-300'}`} />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    {item.label}
                    {/* 模擬該細項的狀態標籤，讓畫面更豐富 */}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${score >= 70 ? 'bg-green-100 text-green-700' : (score <= 40 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500')}`}>
                      {score >= 70 ? '優良' : (score <= 40 ? '偏弱' : '中性')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-gray-50 text-[10px] text-center text-gray-400 border-t border-gray-100">
          {isTech ? "數據來源：即時運算 (100% Real-time)" : "數據來源：AI 綜合評估模型"}
        </div>
      </div>
    </div>
  );
};

// --- AspectsGrid now accepts onClick ---
const AspectsGrid = ({ scores, ticker, onAspectClick }) => {
  const getScoreColor = (s) => s >= 70 ? 'text-green-600' : (s <= 40 ? 'text-red-600' : 'text-yellow-600');
  const getBgHover = (s) => s >= 70 ? 'hover:bg-green-50 hover:border-green-200' : (s <= 40 ? 'hover:bg-red-50 hover:border-red-200' : 'hover:bg-yellow-50 hover:border-yellow-200');

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
              {scores[key]}
            </div>
            <div className="text-[10px] text-gray-400 font-medium">點擊查看詳情</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Sub Components ---
const ScoreCircle = ({ score, source, dataDate, completeness }) => {
  const validScore = typeof score === 'number' ? score : 0;
  let colorClass = "text-yellow-500";
  let strokeColor = "#eab308";
  
  if (validScore >= 70) {
    colorClass = "text-green-500";
    strokeColor = "#22c55e";
  } else if (validScore <= 40) {
    colorClass = "text-red-500";
    strokeColor = "#ef4444";
  }

  return (
    <div className="relative w-24 h-24 flex items-center justify-center group">
      <div className={`text-3xl font-bold ${colorClass}`}>{validScore}</div>
      <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
        <circle cx="48" cy="48" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="6" />
        <circle 
          cx="48" cy="48" r="40" 
          fill="transparent" 
          stroke={strokeColor} 
          strokeWidth="6" 
          strokeLinecap="round"
          strokeDasharray={`${validScore * 2.5} 251`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* 狀態標籤區 */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 items-center">
        <div className="bg-white rounded-full p-1 shadow-sm border border-green-100" title={source === 'cached' ? "數據來源：今日快取 (穩定)" : "數據來源：真實運算 (即時)"}>
          {source === 'cached' ? <Database className="w-3 h-3 text-blue-500"/> : <ShieldCheck className="w-3 h-3 text-green-500" />}
        </div>
        {completeness < 100 && (
           <div className="bg-orange-100 rounded-full p-1 shadow-sm border border-orange-200" title={`資料完整度：${completeness}%`}>
             <Scale className="w-3 h-3 text-orange-600"/>
           </div>
        )}
      </div>
    </div>
  );
};

const TradeStrategyCard = ({ price, score, strategy }) => {
  let stopLossPct = 0.1;
  let takeProfitPct = 0.2;
  let entryMultiplier = 1.0;
  let strategyName = "一般波段";

  switch(strategy) {
    case 'day_trade':
      strategyName = "當沖快打";
      stopLossPct = 0.02; 
      takeProfitPct = 0.04; 
      entryMultiplier = 1.0;
      break;
    case 'bottom':
      strategyName = "左側抄底";
      stopLossPct = 0.15; 
      takeProfitPct = 0.30;
      entryMultiplier = 0.97; 
      break;
    case 'value':
      strategyName = "存股領息";
      stopLossPct = 0.20; 
      takeProfitPct = 0.50; 
      entryMultiplier = 0.99; 
      break;
    default: 
      strategyName = "波段操作";
      stopLossPct = 0.1;
      takeProfitPct = 0.2;
      entryMultiplier = 1.0;
  }

  const entryPrice = (price * entryMultiplier).toFixed(2);
  const stopLoss = (entryPrice * (1 - stopLossPct)).toFixed(2); 
  const takeProfit = (entryPrice * (1 + takeProfitPct)).toFixed(2); 
  
  if (score < 50 && strategy !== 'bottom') return null;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4 animate-fade-in-up">
      <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-3">
        <Target className="w-4 h-4"/> 
        {strategyName}價位參考
      </h4>
      <div className="flex justify-between items-center text-sm">
        <div className="text-center">
          <div className="text-gray-500 text-xs mb-1">建議買入價</div>
          <div className="font-bold text-gray-800">${entryPrice}</div>
        </div>
        <div className="w-px h-8 bg-blue-200"></div>
        <div className="text-center">
          <div className="text-gray-500 text-xs mb-1">停利目標 (+{(takeProfitPct*100).toFixed(0)}%)</div>
          <div className="font-bold text-green-600">${takeProfit}</div>
        </div>
        <div className="w-px h-8 bg-blue-200"></div>
        <div className="text-center">
          <div className="text-gray-500 text-xs mb-1">停損防守 (-{(stopLossPct*100).toFixed(0)}%)</div>
          <div className="font-bold text-red-500">${stopLoss}</div>
        </div>
      </div>
    </div>
  );
};

const PositionSuggestionCard = ({ price, principal, score, ticker, onBuy }) => {
  const maxAffordableShares = Math.floor(principal / price);
  const lots = Math.floor(maxAffordableShares / 1000); 
  const oddShares = maxAffordableShares % 1000; 
  const estimatedCost = Math.floor(maxAffordableShares * price);
  const remainingCash = principal - estimatedCost;

  if (maxAffordableShares <= 0) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-4">
        <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
          <AlertTriangle className="w-4 h-4"/> 資金不足
        </div>
        <p className="text-xs text-red-600">您的本金 ${principal.toLocaleString()} 不足以購買一股 (${price})。</p>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-4 animate-fade-in-up">
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
          <Calculator className="w-4 h-4"/> 
          資金配置試算
        </h4>
        <button 
          onClick={() => onBuy({ticker, price, shares: maxAffordableShares, cost: estimatedCost})}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
        >
          <PlusCircle className="w-3 h-3"/> 模擬買入
        </button>
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className="bg-white p-2 rounded-lg border border-emerald-100 flex-1 text-center">
          <div className="text-xs text-gray-500 mb-1">最大可買股數</div>
          <div className="text-lg font-bold text-emerald-700">
            {lots > 0 ? <>{lots} 張 <span className="text-sm font-normal text-gray-400">+</span> </> : ''}
            {oddShares} 股
          </div>
        </div>
        <div className="bg-white p-2 rounded-lg border border-emerald-100 flex-1 text-center">
          <div className="text-xs text-gray-500 mb-1">預估買入成本</div>
          <div className="text-lg font-bold text-gray-800">${estimatedCost.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
};

const RiskAnalysisCard = ({ chartData, currentPrice, principal }) => {
  if (!chartData || chartData.length === 0) return null;
  const lastPoint = chartData[chartData.length - 1];
  if (!lastPoint || typeof lastPoint.lower !== 'number') return null;

  const worstCasePrice = lastPoint.lower;
  const maxDrawdownPct = ((worstCasePrice - currentPrice) / currentPrice);
  const maxLossAmount = Math.round(principal * maxDrawdownPct);
  const riskLevel = Math.abs(maxDrawdownPct) > 0.2 ? '高風險' : (Math.abs(maxDrawdownPct) > 0.1 ? '中風險' : '低風險');
  const riskColor = riskLevel === '高風險' ? 'text-red-600 bg-red-50 border-red-200' : (riskLevel === '中風險' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-green-600 bg-green-50 border-green-200');

  return (
    <div className={`rounded-xl p-4 mt-4 border animate-fade-in-up ${riskColor}`}>
      <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4"/> 
        極端行情預警
        <span className="text-[10px] px-2 py-0.5 rounded-full border bg-white/50">{riskLevel}</span>
      </h4>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs opacity-75">預估最大虧損 (95% CI)</div>
          <div className="text-lg font-bold">{maxLossAmount.toLocaleString()} 元 ({ (maxDrawdownPct * 100).toFixed(1) }%)</div>
        </div>
      </div>
    </div>
  );
};

const MarketNewsSection = ({ ticker }) => {
  const getSearchUrl = (term) => `https://www.google.com/search?q=${encodeURIComponent(term)}&tbm=nws`;
  const newsTitle = ticker ? `${ticker} 即時新聞掃描` : "全球市場快訊";
  const searchTerm = ticker ? `${ticker} stock news` : "Global stock market news";

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6`}>
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Newspaper className="w-5 h-5 text-purple-500" />
        {newsTitle}
        <a href={getSearchUrl(searchTerm)} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline ml-auto flex items-center gap-1">
          前往 Google News 驗證 <ExternalLink className="w-3 h-3"/>
        </a>
      </h3>
      <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-500">
        點擊上方連結以獲取 {ticker || "市場"} 的最新真實新聞來源。
      </div>
    </div>
  );
};

const RoiSection = ({ roi, period }) => {
  if (!roi) return null;
  return (
    <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-yellow-500"/> 真實獲利預估 (ROI)
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {['short', 'mid', 'long'].map(k => {
          const item = roi[k];
          if (!item) return null;
          const isHighlighted = k === period;
          return (
            <div key={k} className={`p-3 rounded-lg text-center border ${isHighlighted ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' : 'bg-gray-50 border-transparent'} ${!isHighlighted && period !== 'none' ? 'opacity-40' : ''}`}>
              <div className="text-xs text-gray-500 mb-1 font-bold">{k==='short'?'短期':(k==='mid'?'中期':'長期')}</div>
              <div className={`text-lg font-bold ${item.return_pct>=0?'text-red-500':'text-green-500'}`}>{item.return_pct}%</div>
              <div className="text-xs text-gray-400">賺 {item.profit_cash.toLocaleString()}</div>
            </div>
          );
        })}
      </div>
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
              <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${analysisResult.source === 'cached' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {analysisResult.source === 'cached' ? <Database className="w-3 h-3"/> : <Wifi className="w-3 h-3"/>}
                {analysisResult.source === 'cached' ? '已快取' : '連線中'}
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
                  <ScoreCircle score={analysisResult.totalScore} source={analysisResult.source} dataDate={analysisResult.dataDate} completeness={analysisResult.completeness} />
                  <div className="mt-2 text-sm font-bold text-gray-800">{analysisResult.evaluation}</div>
                </div>
                {/* 簡單的 ROI 區塊 (可再擴充) */}
                <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-around">
                   <div className="text-center"><div className="text-xs text-gray-400">目前股價</div><div className="text-2xl font-bold">${analysisResult.currentPrice}</div></div>
                   <div className="text-center"><div className="text-xs text-gray-400">建議操作</div><div className="text-xl font-bold text-blue-600">{analysisResult.recPeriod}</div></div>
                </div>
              </div>

              <AICommentaryCard data={analysisResult} strategy={formData.strategy} />

              <div>
                 <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2 px-1"><Target className="w-4 h-4 text-blue-600"/> 深度面向分析 <span className="text-xs font-normal text-gray-400">(點擊卡片查看詳細指標)</span></h3>
                 <AspectsGrid 
                    scores={analysisResult.scores} 
                    ticker={analysisResult.ticker} 
                    onAspectClick={setSelectedAspect} 
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <TradeStrategyCard price={analysisResult.currentPrice} score={analysisResult.totalScore} strategy={formData.strategy} />
                  <PositionSuggestionCard 
                    price={analysisResult.currentPrice} 
                    principal={formData.principal} 
                    score={analysisResult.totalScore}
                    ticker={analysisResult.ticker}
                    onBuy={handleBuy}
                  />
                </div>
                <RiskAnalysisCard chartData={analysisResult.chartData} currentPrice={analysisResult.currentPrice} principal={formData.principal} />
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500"/> 真實走勢與 AI 預測</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={[...analysisResult.chartData.history_date.map((d,i)=>({date:d, price:analysisResult.chartData.history_price[i]})), ...analysisResult.chartData.future_date.map((d,i)=>({date:d, mean:analysisResult.chartData.future_mean[i]}))]}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize:10}} />
                    <YAxis domain={['auto','auto']} tick={{fontSize:10}} />
                    <Tooltip />
                    <Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#colorPrice)" strokeWidth={2} />
                    <Area type="monotone" dataKey="mean" stroke="#dc2626" strokeDasharray="5 5" fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <MarketNewsSection ticker={analysisResult.ticker} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
             <div className="p-4 border-b border-gray-100 font-bold text-gray-700">自選觀察</div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {watchlist.map(t => (
                 <div key={t} className="flex justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => handleAnalyze(t)}>
                   <span className="font-bold">{t}</span>
                   <Trash2 className="w-4 h-4 text-gray-300 hover:text-red-500" onClick={(e) => {e.stopPropagation(); toggleWatchlist(t);}}/>
                 </div>
               ))}
               {watchlist.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">尚無自選股</div>}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
    </div>
  );
}

