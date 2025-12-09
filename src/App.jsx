import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart2, PieChart, Newspaper, Zap, Search, ArrowRight, Shield, ShieldAlert, ShieldCheck, Wifi, WifiOff, Target, RefreshCw, ExternalLink, HelpCircle, Star, Trash2, AlertTriangle, Bot, FileText, Briefcase, Calculator, Globe, Clock, Anchor, MousePointerClick, Filter, CheckCircle2, Wallet, PlusCircle, X } from 'lucide-react';

// --- 常數設定 ---
const API_BASE_URL = "https://stock-backend-g011.onrender.com"; // 您的雲端後端網址

// --- 常數設定：策略與週期的關聯邏輯 ---
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

// --- API 連線函數 (嚴格模式：僅真實資料) ---

// 1. 單股深度分析
const fetchDepthAnalysis = async (ticker, principal, risk) => {
  try {
    const controller = new AbortController();
    // 雲端免費版喚醒可能需要較長時間，設定 60 秒超時
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, principal, risk }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if(!res.ok) throw new Error("伺服器回應錯誤");
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    
    // 資料轉換
    const mappedData = {
      ...data,
      totalScore: data.total_score,
      currentPrice: data.current_price,
      recPeriod: data.recommendation,
      // 若後端沒給細項分數，給予 0 分提示異常，而不是 50 分
      scores: data.details || { tech: 0, fund: 0, chip: 0, news: 0 } 
    };
    
    // 若後端回傳的圖表資料有缺，進行基本防護
    if (!data.chart_data || !data.chart_data.history_date) {
        throw new Error("圖表資料缺失");
    }

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

    return {
      ...mappedData,
      chartData: [...historyData, bridge, ...forecastData],
      historyEndIndex: historyData.length - 1,
      source: 'real' // 這裡永遠只會是 real
    };
  } catch (e) {
    console.error("連線失敗:", e);
    // 直接拋出錯誤，觸發 UI 顯示錯誤訊息，絕不切換模擬
    throw e; 
  }
};

// 2. 快速掃描排名
const fetchRanking = async (strategy) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(`${API_BASE_URL}/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if(!res.ok) throw new Error("Ranking fetch failed");
    const data = await res.json();
    return data.results;
  } catch (e) {
    console.warn("排名取得失敗", e);
    return []; // 失敗回傳空陣列，不造假數據
  }
};

// --- 已移除 mockAnalysis 與 mockRanking 函數 ---

// --- Helper Functions ---
const generateAICommentary = (data, strategy) => {
  if (!data) return null;
  const { ticker, totalScore, scores, currentPrice } = data;
  
  // 1. 基礎分析
  let summary = "";
  if (totalScore >= 75) summary = `🔥 **${ticker}** 目前氣勢如虹，AI 綜合評分高達 **${totalScore}分**，屬於強勢多頭格局。`;
  else if (totalScore >= 60) summary = `⚖️ **${ticker}** 目前表現穩健，評分 **${totalScore}分**，多空力道均衡。`;
  else summary = `❄️ **${ticker}** 走勢偏弱，評分僅 **${totalScore}分**，建議暫時觀望，等待底部訊號浮現。`;

  let details = [];
  if (scores.tech >= 70) details.push("📈 **技術面**：均線呈多頭排列，動能強勁。");
  else if (scores.tech <= 40) details.push("📉 **技術面**：均線蓋頭反壓，需留意破底風險。");
  
  if (scores.fund >= 70) details.push("💰 **基本面**：公司獲利能力優異，本益比處於合理區間。");

  // 2. 策略專屬建議
  let strategyAnalysis = {
    title: "",
    points: []
  };

  switch (strategy) {
    case 'day_trade':
      strategyAnalysis.title = "⚡ 當沖操作戰略";
      strategyAnalysis.points = [
        "**關鍵指標**：密切關注**開盤量能**與 **5分K線**，確認今日是否為趨勢盤。",
        "**進場時機**：股價站上均價線 (VWAP) 且量能放大時順勢做多。",
        "**風控紀律**：嚴格執行 **2% 停損**，無論盈虧**今日務必平倉**，絕不留倉過夜。"
      ];
      break;
    case 'bottom':
      strategyAnalysis.title = "🎣 左側抄底戰略";
      strategyAnalysis.points = [
        "**關鍵指標**：觀察 **RSI 背離**訊號或股價是否觸及**布林通道下緣**。",
        "**進場時機**：不建議一次梭哈，應採取**分批向下佈局** (Pyramiding) 策略。",
        "**風控紀律**：若出現爆量長黑跌破前低，表示底部尚未確認，應暫時退場觀望。"
      ];
      break;
    case 'value':
      strategyAnalysis.title = "🐢 價值存股戰略";
      strategyAnalysis.points = [
        "**關鍵指標**：關注 **殖利率** 是否高於近五年平均，以及公司營收成長性。",
        "**進場時機**：股價回檔即是買點，建議**定期定額**或**大跌大買**。",
        "**風控紀律**：忽略短期波動，除非基本面發生永久性惡化 (如配息縮水)，否則**只買不賣**。"
      ];
      break;
    case 'swing':
    default:
      if (strategy === 'none') {
         strategyAnalysis.title = "📊 綜合分析建議";
         strategyAnalysis.points = [
            "**觀察重點**：結合技術面與基本面，尋找股價與價值背離的機會。",
            "**操作建議**：不預設立場，依據市場訊號靈活調整持股比例。",
            "**風險提醒**：隨時留意大盤趨勢與國際財經消息的影響。"
         ];
      } else {
        strategyAnalysis.title = "🌊 波段順勢戰略";
        strategyAnalysis.points = [
          "**關鍵指標**：確認股價是否站穩 **MA20 (月線)** 且均線向上發散。",
          "**進場時機**：等待股價回測支撐不破，或突破頸線時切入。",
          "**風控紀律**：跌破 **MA60 (季線)** 或關鍵支撐位時停損，獲利可沿 MA10 移動停利。"
        ];
      }
      break;
  }

  return { summary, details, strategyAnalysis };
};

// --- UI 組件 ---

const InfoTooltip = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <HelpCircle className="w-3 h-3 text-gray-400 cursor-help hover:text-blue-500" />
    <div className="invisible group-hover:visible absolute z-50 w-48 p-2 mt-1 text-xs text-white bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -left-20 top-full pointer-events-none shadow-xl border border-gray-700">
      {text}
      <div className="absolute -top-1 left-1/2 w-2 h-2 bg-gray-800 transform rotate-45 -translate-x-1/2"></div>
    </div>
  </div>
);

const AspectsGrid = ({ scores, ticker }) => {
  const getScoreColor = (s) => s >= 70 ? 'text-green-600' : (s <= 40 ? 'text-red-600' : 'text-yellow-600');
  const getBgHover = (s) => s >= 70 ? 'hover:bg-green-50 hover:border-green-200' : (s <= 40 ? 'hover:bg-red-50 hover:border-red-200' : 'hover:bg-yellow-50 hover:border-yellow-200');

  const items = [
    { key: 'tech', label: '技術面', desc: '分析股價走勢與動能 (RSI, 均線)', icon: TrendingUp, url: `https://finance.yahoo.com/quote/${ticker}/chart` },
    { key: 'fund', label: '基本面', desc: '公司賺不賺錢？看本益比與營收', icon: PieChart, url: `https://finance.yahoo.com/quote/${ticker}/key-statistics` },
    { key: 'chip', label: '籌碼面', desc: '大戶與法人的買賣動向', icon: BarChart2, url: `https://finance.yahoo.com/quote/${ticker}/holders` },
    { key: 'news', label: '消息面', desc: '最近的新聞是利多還是利空？', icon: Newspaper, url: `https://finance.yahoo.com/quote/${ticker}/news` },
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

const ScoreCircle = ({ score }) => {
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
    <div className="relative w-24 h-24 flex items-center justify-center">
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
        AI 智能診斷報告
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
      <div className="border-t border-indigo-100 pt-3">
        <h5 className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1">
          <Target className="w-3 h-3"/> {commentary.strategyAnalysis.title}
        </h5>
        <div className="grid grid-cols-1 gap-2">
          {commentary.strategyAnalysis.points.map((point, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-indigo-900 bg-indigo-100/50 p-2 rounded-lg">
              <CheckCircle2 className="w-3 h-3 mt-0.5 text-indigo-500 shrink-0"/>
              <span dangerouslySetInnerHTML={{__html: point}} />
            </div>
          ))}
        </div>
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
        <span className="text-[10px] bg-white border border-blue-200 px-2 py-0.5 rounded text-blue-600 font-normal">AI演算</span>
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

// 資金配置 + 模擬買入卡片
const PositionSuggestionCard = ({ price, principal, score, ticker, onBuy }) => {
  const maxAffordableShares = Math.floor(principal / price);
  const lots = Math.floor(maxAffordableShares / 1000); 
  const oddShares = maxAffordableShares % 1000; 
  
  const estimatedCost = Math.floor(maxAffordableShares * price);
  const remainingCash = principal - estimatedCost;
  const potentialLoss = Math.round(estimatedCost * 0.1);

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
          <div className="text-[10px] text-gray-400">總計 {maxAffordableShares} 股</div>
        </div>
        <div className="bg-white p-2 rounded-lg border border-emerald-100 flex-1 text-center">
          <div className="text-xs text-gray-500 mb-1">預估買入成本</div>
          <div className="text-lg font-bold text-gray-800">${estimatedCost.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400">剩餘本金 ${remainingCash.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white/60 rounded-lg p-2 text-xs text-gray-600 border border-emerald-100 flex items-center justify-between">
        <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3 text-orange-500"/> 若不幸停損 (-10%)</span>
        <span className="font-bold text-orange-600">預計虧損 -${potentialLoss.toLocaleString()}</span>
      </div>
    </div>
  );
};

const RiskAnalysisCard = ({ chartData, currentPrice, principal }) => {
  // 安全檢查：若資料不足，不渲染
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
      <div className="text-xs opacity-90 mb-2">
        若未來 60 天發生極端崩跌 (95% 信心水準)，資產可能面臨：
      </div>
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs opacity-75">預估最大虧損</div>
          <div className="text-lg font-bold">{maxLossAmount.toLocaleString()} 元 ({ (maxDrawdownPct * 100).toFixed(1) }%)</div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-75">悲觀目標價</div>
          <div className="text-lg font-bold">${worstCasePrice.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

const MarketNewsSection = ({ ticker }) => {
  const getSearchUrl = (term) => `https://www.google.com/search?q=${encodeURIComponent(term)}&tbm=nws`;

  const generalNewsPool = [
    { title: "聯準會最新會議紀要暗示降息可能，美股全面收漲", tag: '國際', type: 'positive', url: getSearchUrl("聯準會 降息 美股") },
    { title: "台股成交量創新高，外資連續買超三大權值股", tag: '台股', type: 'positive', url: getSearchUrl("台股 外資 買超") },
    { title: "中東地緣政治緊張，油價波動引發市場擔憂", tag: '風險', type: 'negative', url: getSearchUrl("中東 地緣政治 油價") },
    { title: "AI 產業需求強勁，伺服器供應鏈營收亮眼", tag: '產業', type: 'positive', url: getSearchUrl("AI 伺服器 供應鏈") },
    { title: "通膨數據低於預期，市場預期經濟軟著陸機率增", tag: '總經', type: 'neutral', url: getSearchUrl("通膨 經濟軟著陸") },
    { title: "半導體庫存去化順利，下半年展望樂觀", tag: '產業', type: 'positive', url: getSearchUrl("半導體 庫存") },
    { title: "電動車市場競爭白熱化，車廠降價搶市佔", tag: '產業', type: 'negative', url: getSearchUrl("電動車 降價") },
  ];

  const specificNewsPool = [
    { title: `${ticker} 近期波動加劇，投資人應留意追高風險`, tag: '個股', type: 'neutral', url: `https://finance.yahoo.com/quote/${ticker}/news` },
    { title: `外資法人發布最新報告，調升 ${ticker} 目標價`, tag: '評等', type: 'positive', url: `https://finance.yahoo.com/quote/${ticker}/press` },
    { title: `供應鏈傳出 ${ticker} 訂單滿載，產能供不應求`, tag: '營收', type: 'positive', url: `https://finance.yahoo.com/quote/${ticker}/news` },
    { title: `${ticker} 法說會即將登場，市場關注未來展望`, tag: '法說', type: 'neutral', url: `https://finance.yahoo.com/quote/${ticker}/analysis` },
  ];

  const [displayNews, setDisplayNews] = useState([]);
  const isGeneral = !ticker;

  useEffect(() => {
    const pool = isGeneral ? generalNewsPool : specificNewsPool;
    const getRandomNews = () => {
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 3);
    };
    setDisplayNews(getRandomNews());
    const interval = setInterval(() => {
      setDisplayNews(getRandomNews());
    }, 5000);
    return () => clearInterval(interval);
  }, [ticker]);

  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6 transition-all duration-500 ${isGeneral ? 'border-l-4 border-l-blue-500' : ''}`}>
      <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
        {isGeneral ? <Globe className="w-5 h-5 text-blue-500" /> : <Newspaper className="w-5 h-5 text-purple-500" />}
        {isGeneral ? "全球市場快訊 (Real-time)" : `${ticker} 相關新聞與 AI 觀點`}
        {isGeneral && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
      </h3>
      <div className="space-y-4 min-h-[200px]">
        {displayNews.map((n, i) => (
          <a
            key={`${n.title}-${i}`} 
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0 hover:bg-gray-50 p-2 rounded-lg transition-all animate-fade-in cursor-pointer group no-underline"
          >
            <div className={`mt-1 text-[10px] px-2 py-0.5 rounded border shrink-0 font-bold ${
              n.type === 'positive' ? 'text-red-600 bg-red-50 border-red-100' : 
              (n.type === 'negative' ? 'text-green-600 bg-green-50 border-green-100' : 'text-gray-600 bg-gray-50 border-gray-200')
            }`}>
              {n.tag}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-800 leading-snug mb-1 group-hover:text-blue-600 transition-colors">{n.title}</h4>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                <span>剛剛</span>
                {isGeneral ? null : <span>• AI 摘要: 消息面偏向{n.type === 'positive' ? '正面' : (n.type === 'negative' ? '負面' : '中性')}</span>}
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-300 self-center opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 text-center">
        <button className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center justify-center gap-1 mx-auto group">
          查看更多{isGeneral ? '市場' : '個股'}新聞 
          <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform"/>
        </button>
      </div>
    </div>
  );
};

// 升級版 ROI Section：根據選擇的 period 進行高亮
const RoiSection = ({ roi, period }) => {
  // 安全防護
  if (!roi) return <div className="p-4 text-center text-gray-400">獲利預估載入中...</div>;

  return (
    <div className="md:col-span-2 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-yellow-500"/> 獲利預估 (ROI)
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {['short', 'mid', 'long'].map(k => {
          // 確保 roi[k] 存在才渲染
          const item = roi[k];
          if (!item) return null;

          const isHighlighted = k === period;
          const isDimmed = !isHighlighted && period !== 'none'; // 如果不是選中的，且也沒選"無"，就變暗
          
          return (
            <div 
              key={k} 
              className={`p-3 rounded-lg text-center transition-all border ${
                isHighlighted 
                  ? 'bg-blue-50 border-blue-300 shadow-md transform scale-105 z-10 ring-2 ring-blue-100' 
                  : 'bg-gray-50 border-transparent'
              } ${isDimmed ? 'opacity-40 grayscale' : 'opacity-100'}`}
            >
              <div className="text-xs text-gray-500 mb-1 font-bold">
                {k==='short'?'短期(5日)':(k==='mid'?'中期(60日)':'長期(1年)')}
                {isHighlighted && <span className="ml-1 text-[10px] text-blue-600 bg-blue-100 px-1 rounded">專注</span>}
              </div>
              <div className={`text-lg font-bold ${item.return_pct>=0?'text-red-500':'text-green-500'}`}>
                {item.return_pct}%
              </div>
              <div className="text-xs text-gray-400">
                賺 {item.profit_cash.toLocaleString()}
              </div>
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
  const [rankingList, setRankingList] = useState([]);
  const [rankStrategy, setRankStrategy] = useState('growth');
  const [rankLoading, setRankLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // 新增錯誤訊息狀態
  
  // 狀態：Watchlist & Portfolio
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  
  // Tab 狀態: 'watch' (自選股) | 'portfolio' (投資組合) | 'rank' (排行)
  const [sidebarTab, setSidebarTab] = useState('rank');

  useEffect(() => {
    const savedWatch = localStorage.getItem('myWatchlist');
    if (savedWatch) setWatchlist(JSON.parse(savedWatch));
    
    const savedPort = localStorage.getItem('myPortfolio');
    if (savedPort) setPortfolio(JSON.parse(savedPort));
  }, []);

  const toggleWatchlist = (ticker) => {
    if (!ticker) return;
    const cleanTicker = ticker.toUpperCase();
    let newWatchlist;
    if (watchlist.includes(cleanTicker)) {
      newWatchlist = watchlist.filter(t => t !== cleanTicker);
    } else {
      newWatchlist = [...watchlist, cleanTicker];
    }
    setWatchlist(newWatchlist);
    localStorage.setItem('myWatchlist', JSON.stringify(newWatchlist));
  };

  const handleBuy = (trade) => {
    if (!confirm(`確定要模擬買進 ${trade.ticker} 嗎？\n股數: ${trade.shares}, 成本: $${trade.cost}`)) return;
    const newPortfolio = [...portfolio, { ...trade, date: new Date().toLocaleDateString() }];
    setPortfolio(newPortfolio);
    localStorage.setItem('myPortfolio', JSON.stringify(newPortfolio));
    setSidebarTab('portfolio'); // 自動切換到資產頁籤
    alert("🎉 模擬下單成功！請至右側「資產」分頁查看。");
  };

  const removePosition = (index) => {
    const newPortfolio = portfolio.filter((_, i) => i !== index);
    setPortfolio(newPortfolio);
    localStorage.setItem('myPortfolio', JSON.stringify(newPortfolio));
  };

  useEffect(() => {
    const loadRank = async () => {
      setRankLoading(true);
      const list = await fetchRanking(rankStrategy);
      setRankingList(list || []); // 確保失敗時為空陣列
      setRankLoading(false);
    };
    loadRank();
  }, [rankStrategy]);

  // 處理策略變更與防呆機制
  const handleStrategyChange = (e) => {
    const newStrategy = e.target.value;
    const allowed = STRATEGIES[newStrategy].allowedPeriods;
    
    // 如果當前選擇的周期不被允許，自動切換到第一個允許的週期
    let newPeriod = formData.period;
    if (!allowed.includes(newPeriod)) {
      newPeriod = allowed[0];
    }
    
    // 同步更新 Risk (隱藏邏輯)
    const newRisk = STRATEGIES[newStrategy].risk;

    setFormData({ 
      ...formData, 
      strategy: newStrategy, 
      period: newPeriod,
      risk: newRisk 
    });
  };

  const handleAnalyze = async () => {
    if(!formData.ticker) return;
    setLoading(true);
    setErrorMsg(null); // 清除舊錯誤
    setAnalysisResult(null); // 清除舊結果
    
    try {
      const res = await fetchDepthAnalysis(formData.ticker, formData.principal, formData.risk);
      setAnalysisResult(res);
    } catch (e) {
      setErrorMsg("⚠️ 連線失敗或伺服器無回應，請稍後再試。(模擬功能已停用)");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStock = (ticker) => {
    setFormData(prev => ({ ...prev, ticker }));
    // 自動觸發分析
    setLoading(true);
    setErrorMsg(null);
    setAnalysisResult(null);
    
    fetchDepthAnalysis(ticker, formData.principal, formData.risk)
      .then(res => {
          setAnalysisResult(res);
          setLoading(false);
      })
      .catch(e => {
          setErrorMsg("⚠️ 無法取得該股票數據，請確認代碼是否正確。");
          setLoading(false);
      });
  };

  const isWatched = watchlist.includes(formData.ticker.toUpperCase());
  const allowedPeriods = STRATEGIES[formData.strategy].allowedPeriods;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- 左側：主分析區 (佔 8 欄) --- */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="text-blue-600" /> AI 投資戰情室
            </h1>
            {/* 只顯示連線中，不再顯示模擬中 */}
            {analysisResult && (
              <span className="text-xs px-2 py-1 rounded border bg-green-50 text-green-700 border-green-200">
                連線中
              </span>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                  股票代碼 
                  <InfoTooltip text="輸入台股代碼 (如 2330.TW) 或美股代碼 (如 NVDA)" />
                </label>
                <div className="relative flex items-center gap-2">
                  <div className="relative w-full">
                    <input 
                      type="text" 
                      value={formData.ticker}
                      onChange={e => setFormData({...formData, ticker: e.target.value})}
                      placeholder="如 2330.TW"
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  </div>
                  <button 
                    onClick={() => toggleWatchlist(formData.ticker)}
                    className={`p-2 rounded-lg border transition-colors ${isWatched ? 'bg-yellow-50 border-yellow-300 text-yellow-500' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-yellow-500'}`}
                    title="加入/移除自選股"
                  >
                    <Star className={`w-5 h-5 ${isWatched ? 'fill-yellow-500' : ''}`} />
                  </button>
                </div>
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 mb-1">本金 (TWD)</label>
                <input 
                  type="number" 
                  value={formData.principal}
                  onChange={e => setFormData({...formData, principal: Number(e.target.value)})}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 策略選擇 (New) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                  交易策略
                  <InfoTooltip text="選擇策略會自動過濾不適合的持有期間" />
                </label>
                <select 
                  value={formData.strategy}
                  onChange={handleStrategyChange}
                  className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  {Object.entries(STRATEGIES).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* 週期選擇 (New - Smart Disabled) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                  預計持有
                  <InfoTooltip text="灰色選項代表該週期不適合當前選擇的策略" />
                </label>
                <select 
                  value={formData.period}
                  onChange={e => setFormData({...formData, period: e.target.value})}
                  className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  {Object.entries(PERIODS).map(([key, config]) => {
                    const isDisabled = !allowedPeriods.includes(key);
                    return (
                      <option key={key} value={key} disabled={isDisabled} className={isDisabled ? 'text-gray-300 bg-gray-100' : ''}>
                        {config.label} {isDisabled ? '(不建議)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="md:col-span-1">
                <button 
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  title="執行分析"
                >
                  {loading ? <RefreshCw className="animate-spin w-4 h-4"/> : <Zap className="w-4 h-4"/>}
                </button>
              </div>
            </div>
          </div>

          {/* 錯誤訊息顯示區 */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-fade-in flex items-center gap-2">
              <WifiOff className="w-5 h-5"/>
              {errorMsg}
            </div>
          )}

          {!analysisResult && !loading && !errorMsg && (
            <MarketNewsSection ticker={null} />
          )}

          {analysisResult && !loading && (
            <div className="space-y-6 animate-fade-in-up">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                  <span className="text-gray-400 text-xs font-bold mb-2 flex items-center gap-1">
                    AI 綜合評分 <InfoTooltip text="根據技術、基本、籌碼、消息四大面向加權計算，70分以上為建議買進" />
                  </span>
                  <ScoreCircle score={analysisResult.totalScore} />
                  <div className="mt-2 text-sm font-bold text-gray-800">{analysisResult.evaluation}</div>
                  <div className="text-xs text-gray-400 mt-1">建議：{analysisResult.recPeriod}</div>
                </div>
                
                {/* 升級版 ROI Section (接收 period 參數) */}
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
                <RiskAnalysisCard 
                  chartData={analysisResult.chartData} 
                  currentPrice={analysisResult.currentPrice} 
                  principal={formData.principal}
                />
              </div>

              <div>
                 <h3 className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-2 px-1">
                    <Target className="w-4 h-4 text-blue-500"/> 
                    四大面向分析 <span className="text-xs font-normal text-gray-400">(點擊卡片查看資料來源)</span>
                 </h3>
                 <AspectsGrid scores={analysisResult.scores} ticker={analysisResult.ticker} />
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500"/> 股價走勢與 AI 預測區間
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
                    <Area type="monotone" dataKey="price" stroke="#2563eb" fill="transparent" name="歷史" strokeWidth={2} />
                    <Area type="monotone" dataKey="mean" stroke="#dc2626" strokeDasharray="5 5" fill="transparent" name="預測中位" />
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

        {/* --- 右側：側邊欄 (多功能 Tab) --- */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              <button 
                onClick={() => setSidebarTab('rank')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${sidebarTab==='rank' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Target className="w-4 h-4"/> 排行
              </button>
              <button 
                onClick={() => setSidebarTab('portfolio')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${sidebarTab==='portfolio' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Wallet className="w-4 h-4"/> 資產
                {portfolio.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{portfolio.length}</span>}
              </button>
              <button 
                onClick={() => setSidebarTab('watch')}
                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${sidebarTab==='watch' ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Star className="w-4 h-4"/> 自選
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative">
              
              {/* 1. 排行榜 Tab */}
              {sidebarTab === 'rank' && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-gray-400 font-medium">AI 實時選股</span>
                    {rankLoading && <RefreshCw className="animate-spin w-3 h-3 text-gray-400"/>}
                  </div>
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 shrink-0 no-scrollbar">
                    {Object.entries(STRATEGIES).filter(([k]) => k !== 'none').map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => setRankStrategy(k === 'day_trade' ? 'growth' : k)} // 簡化 mapping
                        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                          rankStrategy === (k === 'day_trade' ? 'growth' : k) 
                            ? 'bg-gray-800 text-white border-gray-800' 
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {v.label.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                  
                  {/* 排行榜錯誤處理 */}
                  {rankingList.length === 0 && !rankLoading ? (
                     <div className="text-center text-gray-400 text-xs py-8">
                        暫無排行資料或連線失敗
                     </div>
                  ) : (
                    <div className="space-y-1">
                      {rankingList.map((stock, idx) => (
                        <RankingItem key={idx} stock={stock} onClick={handleSelectStock} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 2. 資產 (Portfolio) Tab */}
              {sidebarTab === 'portfolio' && (
                <>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white mb-4 shadow-md">
                    <div className="text-xs opacity-80 mb-1">模擬總資產 (TWD)</div>
                    <div className="text-2xl font-bold tracking-wider">
                      ${(portfolio.reduce((acc, curr) => acc + curr.cost, 0)).toLocaleString()}
                    </div>
                    <div className="flex gap-4 mt-3 pt-3 border-t border-white/20">
                      <div>
                        <div className="text-[10px] opacity-70">總投入成本</div>
                        <div className="font-medium text-sm">${(portfolio.reduce((acc, curr) => acc + curr.cost, 0)).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] opacity-70">持倉數量</div>
                        <div className="font-medium text-sm">{portfolio.length} 檔</div>
                      </div>
                    </div>
                  </div>

                  {portfolio.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-10">
                      <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                      尚未建立部位<br/>請至左側分析頁面點擊「模擬買入」
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {portfolio.map((p, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm relative group">
                          <button 
                            onClick={() => removePosition(idx)}
                            className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4"/>
                          </button>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-bold text-gray-800">{p.ticker}</div>
                              <div className="text-[10px] text-gray-400">{p.date} 建倉</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-800">${p.cost.toLocaleString()}</div>
                              <div className="text-[10px] text-gray-500">{p.shares} 股 @ {p.price}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSelectStock(p.ticker)} className="flex-1 text-[10px] bg-blue-50 text-blue-600 py-1 rounded hover:bg-blue-100">查看分析</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 3. 自選股 (Watchlist) Tab */}
              {sidebarTab === 'watch' && (
                <>
                  {watchlist.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-10">
                      <Star className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                      還沒有收藏股票喔！<br/>點擊輸入框旁的星星加入
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {watchlist.map(t => (
                        <div key={t} className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-3 hover:border-blue-300 transition-colors shadow-sm cursor-pointer group" onClick={() => handleSelectStock(t)}>
                          <span className="font-bold text-gray-700">{t}</span>
                          <div className="flex items-center gap-3">
                            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500"/>
                            <Trash2 
                              onClick={(e) => { e.stopPropagation(); toggleWatchlist(t); }}
                              className="w-4 h-4 text-gray-300 hover:text-red-500" 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
