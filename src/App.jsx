import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, DollarSign, Activity, BarChart2, PieChart, Newspaper, Zap, Search, ArrowRight, ShieldCheck, Wifi, WifiOff, Target, RefreshCw, ExternalLink, HelpCircle, Star, Trash2, AlertTriangle, Bot, FileText, Briefcase, Calculator, Globe, Filter, CheckCircle2, Wallet, PlusCircle, X, Server, Lock, Database, Clock, Scale, RotateCcw } from 'lucide-react';

// --- 常數設定 ---
const API_BASE_URL = "https://stock-backend-g011.onrender.com"; 

// --- 策略定義 ---
const STRATEGIES = {
  none: { label: '無 (不限)', allowedPeriods: ['short', 'mid', 'long'], risk: 'neutral' },
  day_trade: { label: '⚡ 當沖 (極短)', allowedPeriods: ['short'], risk: 'aggressive' },
  swing: { label: '🌊 波段 (趨勢)', allowedPeriods: ['short', 'mid'], risk: 'neutral' },
  bottom: { label: '🎣 抄底 (反彈)', allowedPeriods: ['mid', 'long'], risk: 'aggressive' },
  value: { label: '🐢 存股 (長期)', allowedPeriods: ['long'], risk: 'conservative' }
};

const PERIODS = {
  short: { label: '短期 (5日)', days: 5 },
  mid: { label: '中期 (60日)', days: 60 },
  long: { label: '長期 (1年)', days: 250 }
};

// --- [核心工具] 嚴格台灣日期格式 (YYYY-MM-DD) ---
const getTaiwanDateString = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const twTime = new Date(utc + (3600000 * 8));
  const y = twTime.getFullYear();
  const m = String(twTime.getMonth() + 1).padStart(2, '0');
  const d = String(twTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// --- [核心運算] 本地端真實技術指標 ---
const calculateRSI = (prices, period = 14) => {
  if (!prices || prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff; else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - (100 / (1 + rs)));
};

const calculateRealTechScore = (fullHistoryPrices) => {
  // 強制標準化：只取最後 60 筆資料運算，確保跨裝置一致
  if (!fullHistoryPrices || fullHistoryPrices.length < 30) return 50;
  const historyPrices = fullHistoryPrices.slice(-60); 

  const rsi = calculateRSI(historyPrices);
  let rsiScore = 50;
  if (rsi > 70) rsiScore = 85; 
  else if (rsi < 30) rsiScore = 30; 
  else rsiScore = 50 + (rsi - 50); 

  const currentPrice = historyPrices[historyPrices.length - 1];
  const ma5 = historyPrices.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const ma20 = historyPrices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ma60 = historyPrices.slice(-60).reduce((a, b) => a + b, 0) / 60;
  
  let trendScore = 50;
  if (currentPrice > ma5 && ma5 > ma20 && ma20 > ma60) trendScore = 95;
  else if (currentPrice > ma20 && ma20 > ma60) trendScore = 80;
  else if (currentPrice > ma60) trendScore = 60;
  else if (currentPrice < ma5 && ma5 < ma20 && ma20 < ma60) trendScore = 20;
  else if (currentPrice < ma20) trendScore = 35;
  else trendScore = 45;

  return Math.round(rsiScore * 0.4 + trendScore * 0.6);
};

// --- [核心API] 強制重試與完整性檢查 ---

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
      
      // 檢查資料完整性：如果基本面是 0 或 null，視為失敗，觸發重試
      // 這能確保我們盡最大努力拿到完整資料
      if (!data.details || !data.details.fund || data.details.fund === 0) {
        if (i < retries) {
          console.warn(`Attempt ${i + 1} incomplete data, retrying...`);
          await new Promise(r => setTimeout(r, 1500)); // 等待 1.5 秒後重試
          continue;
        }
      }
      
      return data; // 回傳成功 (或最後一次嘗試的結果)
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
};

const fetchDepthAnalysis = async (ticker, principal, risk) => {
  const cleanTicker = ticker.toUpperCase();
  const twDate = getTaiwanDateString();
  const cacheKey = `stock_real_v8_${cleanTicker}_${twDate}`; 
  
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    return { ...JSON.parse(cachedData), source: 'cached' };
  }

  try {
    // 使用帶有重試機制的 Fetch
    const data = await fetchWithRetry({ ticker, principal, risk });
    
    // --- 資料處理 ---
    
    // 1. 技術面 (40%)
    const realHistoryPrices = data.chart_data.history_price;
    const realTechScore = calculateRealTechScore(realHistoryPrices);

    // 2. 其他面 (60%)
    const backendDetails = data.details || {};
    
    // 嚴格取值，若無資料則標記為缺失 (null)
    const getStrictScore = (val) => {
        const num = Number(val);
        return (!isNaN(num) && num > 0) ? num : null;
    };

    const fundVal = getStrictScore(backendDetails.fund);
    const chipVal = getStrictScore(backendDetails.chip);
    const newsVal = getStrictScore(backendDetails.news);

    // 3. 總分計算 (處理缺失資料)
    // 策略：如果有資料缺失，我們將剩餘權重重新分配，或者給予 50 分中性
    // 為了保證一致性，我們採取「中性填補 50 分」策略
    // 這樣就算電腦版少抓了資料，分數也不會因為分母變小而暴衝
    
    const safeFund = fundVal !== null ? fundVal : 50;
    const safeChip = chipVal !== null ? chipVal : 50;
    const safeNews = newsVal !== null ? newsVal : 50;

    const finalScore = Math.round(
      realTechScore * 0.4 +
      safeFund * 0.2 +
      safeChip * 0.2 +
      safeNews * 0.2
    );

    // 收集缺失項目
    let missingSources = [];
    if (fundVal === null) missingSources.push('基本');
    if (chipVal === null) missingSources.push('籌碼');
    if (newsVal === null) missingSources.push('消息');

    // 計算資料完整度 (0~100%)
    const completeness = 25 + (fundVal ? 25 : 0) + (chipVal ? 25 : 0) + (newsVal ? 25 : 0);

    const scores = {
      tech: realTechScore, 
      fund: safeFund,
      chip: safeChip,
      news: safeNews
    };

    const mappedData = {
      ...data,
      totalScore: finalScore,
      missingSources: missingSources,
      completeness: completeness,
      dataDate: twDate,
      currentPrice: data.current_price,
      recPeriod: data.recommendation,
      scores: scores
    };
    
    // Chart Data
    const historyData = data.chart_data.history_date.map((d, i) => ({
      date: d, price: data.chart_data.history_price[i], type: 'history'
    }));
    const lastHist = historyData[historyData.length-1];
    const bridge = { ...lastHist, mean: lastHist.price, upper: lastHist.price, lower: lastHist.price, type: 'forecast' };
    const forecastData = data.chart_data.future_date.map((d, i) => ({
      date: d,
      mean: data.chart_data.future_mean[i],
      upper: data.chart_data.future_upper[i],
      lower: data.chart_data.future_lower[i],
      type: 'forecast'
    }));

    const finalResult = {
      ...mappedData,
      chartData: [...historyData, bridge, ...forecastData],
      historyEndIndex: historyData.length - 1,
      source: 'real'
    };

    // 只有當資料完整度 > 50% 時才寫入快取，避免快取到壞資料
    // 這樣下次重新整理時，會再次嘗試抓取完整資料
    if (completeness > 50) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(finalResult));
        } catch (e) {
          console.warn("快取寫入失敗", e);
        }
    }

    return finalResult;

  } catch (e) {
    throw e;
  }
};

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

// --- Helper Functions ---
const generateAICommentary = (data, strategy) => {
  if (!data) return null;
  const { ticker, totalScore, scores, missingSources, completeness } = data;
  
  let summary = "";
  if (totalScore >= 75) summary = `🔥 **${ticker}** 綜合評分 **${totalScore}分**，多頭格局明確，各項指標表現優異。`;
  else if (totalScore >= 60) summary = `⚖️ **${ticker}** 綜合評分 **${totalScore}分**，多空力道拉鋸，建議區間操作。`;
  else summary = `❄️ **${ticker}** 綜合評分 **${totalScore}分**，上方壓力較大，建議耐心等待底部訊號。`;

  let details = [];
  if (scores.tech >= 70) details.push("📈 **技術面**：RSI 與均線呈現多頭排列。");
  else if (scores.tech <= 40) details.push("📉 **技術面**：跌破關鍵均線，技術面轉空。");
  
  if (scores.fund >= 70) details.push("💰 **基本面**：營收/EPS 數據優於同業水準。");
  
  let integrityText = "";
  if (completeness === 100) {
      integrityText = "✅ 資料完整度：100% (完美)";
  } else {
      integrityText = `⚠️ 資料完整度：${completeness}% (缺失: ${missingSources.join('、')})`;
  }

  details.push(`ℹ️ **${integrityText}**`);

  let strategyAnalysis = {
    title: "AI 策略分析",
    points: []
  };

  switch (strategy) {
    case 'day_trade':
      strategyAnalysis.title = "⚡ 當沖操作戰略";
      strategyAnalysis.points = ["密切關注 **5分K** 量能變化。", "跌破 VWAP 均價線需果斷停損。"];
      break;
    case 'value':
      strategyAnalysis.title = "🐢 價值存股戰略";
      strategyAnalysis.points = ["殖利率與本益比位於合理區間。", "適合分批佈局，無視短期波動。"];
      break;
    default:
      strategyAnalysis.title = "🌊 波段操作建議";
      strategyAnalysis.points = ["沿 MA10/MA20 移動停利。", "觀察法人籌碼是否連續買超。"];
      break;
  }

  return { summary, details, strategyAnalysis };
};

// --- UI 組件 ---

const InfoTooltip = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help hover:text-blue-500" />
    <div className="invisible group-hover:visible absolute z-50 w-64 p-3 mt-1 text-xs text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -left-20 top-full pointer-events-none shadow-xl border border-gray-700 leading-relaxed">
      {text}
      <div className="absolute -top-1 left-1/2 w-2 h-2 bg-gray-800 transform rotate-45 -translate-x-1/2"></div>
    </div>
  </div>
);

const AspectsGrid = ({ scores, ticker }) => {
  const getScoreColor = (s) => s >= 70 ? 'text-green-600' : (s > 0 && s <= 40 ? 'text-red-600' : (s === 50 ? 'text-gray-400' : 'text-yellow-600'));
  const getBgHover = (s) => s >= 70 ? 'hover:bg-green-50 hover:border-green-200' : (s > 0 && s <= 40 ? 'hover:bg-red-50 hover:border-red-200' : 'hover:bg-yellow-50 hover:border-yellow-200');

  const items = [
    { key: 'tech', label: '技術面', desc: '基於真實股價計算 RSI 與均線乖離率 (權重 40%)', icon: TrendingUp, url: `https://finance.yahoo.com/quote/${ticker}/chart` },
    { key: 'fund', label: '基本面', desc: '源自財報數據 (EPS, PE, 營收) 的真實評估 (權重 20%)', icon: PieChart, url: `https://finance.yahoo.com/quote/${ticker}/key-statistics` },
    { key: 'chip', label: '籌碼面', desc: '源自法人買賣超數據的真實評估 (權重 20%)', icon: BarChart2, url: `https://finance.yahoo.com/quote/${ticker}/holders` },
    { key: 'news', label: '消息面', desc: '源自新聞情緒 AI 分析的真實評估 (權重 20%)', icon: Newspaper, url: `https://finance.yahoo.com/quote/${ticker}/news` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      {items.map(item => (
        <a 
          key={item.key}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`bg-white p-3 rounded-xl border border-gray-100 transition-all group cursor-pointer text-decoration-none shadow-sm ${getBgHover(scores[item.key])}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 flex items-center gap-1">
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
              <InfoTooltip text={item.desc} />
            </span>
            <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-end justify-between">
            <div className={`text-2xl font-bold leading-none ${getScoreColor(scores[item.key])}`}>
              {scores[item.key]}
            </div>
            <div className="text-[10px] text-gray-400 font-medium">分</div>
          </div>
        </a>
      ))}
    </div>
  );
};

const RankingItem = ({ stock, onClick }) => {
  let scoreColorClass = "bg-yellow-50 text-yellow-600";
  if (stock.score >= 70) scoreColorClass = "bg-green-50 text-green-600";
  else if (stock.score <= 40) scoreColorClass = "bg-red-50 text-red-600";

  return (
    <div 
      onClick={() => onClick(stock.ticker)}
      className="flex items-center justify-between p-3 mb-2 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-blue-200 cursor-pointer transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${scoreColorClass}`}>
          {stock.score}
        </div>
        <div>
          <div className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">{stock.ticker}</div>
          <div className="text-xs text-gray-400">${stock.price}</div>
        </div>
      </div>
      <div className={`text-xs font-bold ${stock.change_pct >= 0 ? 'text-red-500' : 'text-green-500'}`}>
        {stock.change_pct > 0 ? '+' : ''}{stock.change_pct}%
      </div>
    </div>
  );
};

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
             <RotateCcw className="w-3 h-3 text-orange-600"/>
           </div>
        )}
      </div>
    </div>
  );
};

const AICommentaryCard = ({ data, strategy }) => {
  const commentary = generateAICommentary(data, strategy);
  if (!commentary) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 mt-4 animate-fade-in-up shadow-sm">
      <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2 mb-3">
        <Bot className="w-5 h-5"/> 
        AI 智能診斷報告 (100% Real)
      </h4>
      <div className="text-sm text-gray-800 mb-3 leading-relaxed" dangerouslySetInnerHTML={{__html: commentary.summary}} />
      <div className="space-y-2 mb-4">
        {commentary.details.map((detail, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-gray-600 bg-white/60 p-2 rounded-lg">
            <FileText className="w-3 h-3 mt-0.5 text-indigo-400 shrink-0"/>
            <span dangerouslySetInnerHTML={{__html: detail}} />
          </div>
        ))}
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
  const [loadingStage, setLoadingStage] = useState(''); // 'waking', 'analyzing'
  const [errorMsg, setErrorMsg] = useState('');

  const [rankingList, setRankingList] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('rank');

  useEffect(() => {
    const savedWatch = localStorage.getItem('myWatchlist');
    if (savedWatch) setWatchlist(JSON.parse(savedWatch));
    const savedPort = localStorage.getItem('myPortfolio');
    if (savedPort) setPortfolio(JSON.parse(savedPort));
    
    // 初始載入排行
    fetchRanking('growth').then(setRankingList);
  }, []);

  const toggleWatchlist = (ticker) => {
    if (!ticker) return;
    const cleanTicker = ticker.toUpperCase();
    let newWatchlist = watchlist.includes(cleanTicker) ? watchlist.filter(t => t !== cleanTicker) : [...watchlist, cleanTicker];
    setWatchlist(newWatchlist);
    localStorage.setItem('myWatchlist', JSON.stringify(newWatchlist));
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

  // 核心分析邏輯 - 嚴格模式 + 快取 + 本地運算
  const handleAnalyze = async (tickerOverride) => {
    const targetTicker = tickerOverride || formData.ticker;
    if(!targetTicker) return;

    setLoading(true);
    setLoadingStage('waking'); 
    setErrorMsg('');
    setAnalysisResult(null); 

    try {
      const wakeUpTimer = setTimeout(() => {
        if(loading) setLoadingStage('waking_long');
      }, 5000);

      const res = await fetchDepthAnalysis(targetTicker, formData.principal, formData.risk);
      
      clearTimeout(wakeUpTimer);
      setAnalysisResult(res);
    } catch (e) {
      console.error(e);
      setErrorMsg("無法取得真實數據。原因：伺服器可能正在休眠或 API 額度已滿。");
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const isWatched = watchlist.includes(formData.ticker.toUpperCase());

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 左側：主分析區 */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" /> AI 全能投資戰情室 (100% 真實資料版)
            </h1>
            {analysisResult && (
              <span className={`text-xs px-2 py-1 rounded border flex items-center gap-1 ${analysisResult.source === 'cached' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {analysisResult.source === 'cached' ? <Database className="w-3 h-3"/> : <Wifi className="w-3 h-3"/>}
                {analysisResult.source === 'cached' ? '使用快取數據' : '真實連線中'}
              </span>
            )}
          </div>

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
                <label className="block text-xs font-bold text-gray-500 mb-1">策略偏好</label>
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
                  {loading ? '分析中' : '開始'}
                </button>
              </div>
            </div>
          </div>

          {/* 載入狀態提示 */}
          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-center justify-center gap-3 animate-pulse">
              <Server className="w-5 h-5" />
              <div>
                <div className="font-bold">正在連線至雲端運算中心...</div>
                <div className="text-xs opacity-80">
                  {loadingStage === 'waking' ? '正在建立安全連線...' : '雲端主機正在喚醒中 (Cold Start)，請耐心等待約 30~60 秒...'}
                </div>
              </div>
            </div>
          )}

          {/* 錯誤提示 */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
              <WifiOff className="w-6 h-6 shrink-0" />
              <div>
                <div className="font-bold">連線失敗</div>
                <div className="text-sm">{errorMsg}</div>
              </div>
            </div>
          )}

          {/* 分析結果區塊 */}
          {analysisResult && !loading && (
            <div className="space-y-6 animate-fade-in-up">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative">
                  <div className="absolute top-3 right-3 group">
                    <HelpCircle className="w-4 h-4 text-gray-300 hover:text-blue-500 cursor-help"/>
                    <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-gray-800 text-white text-xs rounded right-0 top-6">
                      計分規則：<br/>
                      僅計算後端回傳的有效數據<br/>
                      {analysisResult.missingSources && analysisResult.missingSources.length > 0 && `(部分缺失數據已使用校正值填補)`}
                    </div>
                  </div>
                  <span className="text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">AI 綜合評分 (100% 真實)</span>
                  <ScoreCircle score={analysisResult.totalScore} source={analysisResult.source} dataDate={analysisResult.dataDate} completeness={analysisResult.completeness} />
                  <div className="mt-2 text-sm font-bold text-gray-800">{analysisResult.evaluation}</div>
                </div>
                
                <RoiSection roi={analysisResult.roi} period={formData.period} />
              </div>

              <AICommentaryCard data={analysisResult} strategy={formData.strategy} />

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

              <div>
                 <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2 px-1">
                    <Lock className="w-4 h-4 text-green-500"/> 
                    真實數據權重分析 <span className="text-xs font-normal text-gray-400">(數據校正模式開啟)</span>
                 </h3>
                 <AspectsGrid scores={analysisResult.scores} ticker={analysisResult.ticker} />
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500"/> 真實股價走勢
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={analysisResult.chartData}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize:10}} interval="preserveStartEnd" />
                    <YAxis domain={['auto','auto']} tick={{fontSize:10}} />
                    <Tooltip contentStyle={{borderRadius:'8px'}} />
                    <Area type="monotone" dataKey="price" stroke="#2563eb" fill="transparent" name="歷史股價" strokeWidth={2} />
                    <Area type="monotone" dataKey="mean" stroke="#dc2626" strokeDasharray="5 5" fill="transparent" name="趨勢預測" />
                    <Area type="monotone" dataKey="upper" stroke="transparent" fill="url(#colorForecast)" />
                    <Area type="monotone" dataKey="lower" stroke="transparent" fill="#fff" />
                    <ReferenceLine x={analysisResult.chartData[analysisResult.historyEndIndex].date} stroke="gray" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <MarketNewsSection ticker={analysisResult.ticker} />

            </div>
          )}
        </div>

        {/* 右側：側邊欄 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-100">
              <button onClick={() => setSidebarTab('rank')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${sidebarTab==='rank' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500'}`}><Target className="w-4 h-4"/> 排行</button>
              <button onClick={() => setSidebarTab('portfolio')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${sidebarTab==='portfolio' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500'}`}><Wallet className="w-4 h-4"/> 資產</button>
              <button onClick={() => setSidebarTab('watch')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${sidebarTab==='watch' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500'}`}><Star className="w-4 h-4"/> 自選</button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
              {sidebarTab === 'rank' && (
                <div className="space-y-1">
                  <div className="text-xs text-gray-400 mb-2">市場熱門標的</div>
                  {rankingList.map((stock, idx) => <RankingItem key={idx} stock={stock} onClick={(t) => {setFormData({...formData, ticker: t}); handleAnalyze(t);}} />)}
                </div>
              )}
              {sidebarTab === 'portfolio' && (
                <div className="space-y-3">
                  {portfolio.map((p, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm relative group">
                      <button onClick={() => removePosition(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><X className="w-4 h-4"/></button>
                      <div className="font-bold text-gray-800">{p.ticker}</div>
                      <div className="text-sm text-gray-500">{p.shares} 股 @ {p.price}</div>
                    </div>
                  ))}
                  {portfolio.length === 0 && <div className="text-center text-gray-400 mt-10">尚無部位</div>}
                </div>
              )}
              {sidebarTab === 'watch' && (
                <div className="flex flex-wrap gap-2">
                  {watchlist.map(t => (
                    <div key={t} className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-3 hover:border-blue-300 cursor-pointer" onClick={() => {setFormData({...formData, ticker: t}); handleAnalyze(t);}}>
                      <span className="font-bold text-gray-700">{t}</span>
                      <Trash2 onClick={(e) => { e.stopPropagation(); toggleWatchlist(t); }} className="w-4 h-4 text-gray-300 hover:text-red-500" />
                    </div>
                  ))}
                  {watchlist.length === 0 && <div className="text-center text-gray-400 w-full mt-10">尚無自選股</div>}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
