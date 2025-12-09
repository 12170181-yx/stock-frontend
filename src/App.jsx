import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { TrendingUp, Activity, BarChart2, PieChart, Newspaper, Zap, Search, ShieldCheck, Wifi, WifiOff, Target, RefreshCw, ExternalLink, HelpCircle, Star, Trash2, Bot, FileText, CheckCircle2, Wallet, PlusCircle, X, Database, Microscope, Scale, Calculator, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';

// ⚠️ 請確認這是您 Render 後端的網址
const API_BASE_URL = "https://stock-backend-g011.onrender.com"; 

// --- 靜態介面定義 (Rich UI) ---
const ANALYSIS_CRITERIA = {
  fund: { 
    title: "基本面分析", 
    icon: PieChart, 
    color: "text-blue-600", 
    bgColor: "bg-blue-50",
    desc: "評估公司真實價值 (EPS, ROE)",
    items: [
      { label: "獲利能力 (EPS)", desc: "每股盈餘是否成長" },
      { label: "經營績效 (ROE)", desc: "股東權益報酬率 > 10%" },
      { label: "本益比 (PE)", desc: "股價是否被高估" }
    ]
  },
  tech: { 
    title: "技術面分析", 
    icon: TrendingUp, 
    color: "text-purple-600", 
    bgColor: "bg-purple-50", 
    desc: "透過量價走勢判斷時機",
    items: [
      { label: "RSI 相對強弱", desc: "判斷超買(>70)或超賣(<30)" },
      { label: "MACD 趨勢", desc: "多空趨勢判斷" },
      { label: "均線系統 (MA)", desc: "5日/20日/60日線排列" },
      { label: "布林通道", desc: "股價波動區間" },
      { label: "KD 指標", desc: "短線轉折訊號" }
    ]
  },
  chip: { 
    title: "籌碼面分析", 
    icon: BarChart2, 
    color: "text-orange-600", 
    bgColor: "bg-orange-50", 
    desc: "追蹤法人資金動向",
    items: [
      { label: "法人買賣超", desc: "外資/投信動向" },
      { label: "成交量能", desc: "資金流動性" }
    ]
  },
  news: { 
    title: "消息面分析", 
    icon: Newspaper, 
    color: "text-green-600", 
    bgColor: "bg-green-50", 
    desc: "市場情緒與新聞",
    items: [
      { label: "新聞情緒", desc: "近期利多/利空消息" }
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

// --- API 連線函數 ---
const fetchDepthAnalysis = async (ticker, principal) => {
  try {
    const res = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, principal, risk: 'neutral' })
    });

    if (!res.ok) {
       throw new Error(`伺服器回應錯誤: ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    throw e;
  }
};

const fetchRankings = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/rankings`);
        if(!res.ok) throw new Error();
        return await res.json();
    } catch(e) {
        console.warn("排行榜載入失敗", e);
        return [];
    }
};

// --- 組件: 詳細視窗 (Modal) ---
const DetailModal = ({ aspectKey, data, onClose }) => {
  if (!aspectKey || !data) return null;
  const config = ANALYSIS_CRITERIA[aspectKey];
  // 後端回傳結構：data.details[aspectKey] (分數)
  const score = data.details[aspectKey]; 
  // 後端回傳結構：data.tech_indicators (技術指標數值)
  const indicators = aspectKey === 'tech' ? data.tech_indicators : {};
  const newsList = aspectKey === 'news' ? data.news_list : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${config.bgColor}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-white ${config.color}`}><config.icon className="w-5 h-5"/></div>
            <div>
              <h3 className={`text-lg font-bold ${config.color}`}>{config.title}</h3>
              <p className="text-xs text-gray-500 opacity-80">Python Backend Data</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
        </div>

        {/* Score */}
        {aspectKey !== 'news' && (
            <div className="p-6 text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
            <div className="text-sm text-gray-400 font-bold mb-1">面向評分</div>
            <div className={`text-6xl font-black ${score>=70?'text-green-600':(score<=40?'text-red-500':'text-yellow-500')}`}>
                {score}
            </div>
            <div className="text-xs text-gray-400 mt-2">後端伺服器運算</div>
            </div>
        )}

        {/* Details Content */}
        <div className="p-4 bg-gray-50 max-h-[40vh] overflow-y-auto custom-scrollbar">
          {/* 技術面：顯示真實指標 */}
          {aspectKey === 'tech' && indicators ? (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-gray-500">RSI (14日)</span><span className={`font-mono font-bold ${indicators.rsi>70?'text-red-500':(indicators.rsi<30?'text-green-500':'text-gray-800')}`}>{indicators.rsi}</span></div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className={`h-full ${indicators.rsi>70?'bg-red-500':(indicators.rsi<30?'bg-green-500':'bg-blue-500')}`} style={{width: `${indicators.rsi}%`}}></div></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-xl border border-gray-200 text-center">
                  <div className="text-[10px] text-gray-400 uppercase">MACD</div>
                  <div className={`font-mono font-bold ${indicators.macd>0?'text-red-500':'text-green-500'}`}>{indicators.macd}</div>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-200 text-center">
                  <div className="text-[10px] text-gray-400 uppercase">KD (K值)</div>
                  <div className="font-mono font-bold text-gray-800">{indicators.k}</div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm space-y-1">
                 <div className="flex justify-between text-xs"><span>MA 5</span><span className="font-mono">{indicators.ma5}</span></div>
                 <div className="flex justify-between text-xs"><span>MA 20</span><span className="font-mono">{indicators.ma20}</span></div>
                 <div className="flex justify-between text-xs"><span>MA 60</span><span className="font-mono">{indicators.ma60}</span></div>
                 <div className="flex justify-between text-xs border-t pt-1 mt-1"><span>布林通道</span><span className="font-mono text-gray-500">{indicators.upper} / {indicators.lower}</span></div>
              </div>
            </div>
          ) : aspectKey === 'news' && newsList ? (
             <div className="space-y-2">
                 {newsList.length > 0 ? newsList.map((n, i) => (
                     <a key={i} href={n.link} target="_blank" rel="noreferrer" className="block p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all text-decoration-none group">
                         <div className="text-sm font-bold text-gray-800 mb-1 line-clamp-2 group-hover:text-blue-600">{n.title}</div>
                         <div className="flex justify-between text-xs text-gray-400">
                             <span>{n.publisher}</span>
                             <span>{n.time}</span>
                         </div>
                     </a>
                 )) : <div className="text-center text-gray-400 py-4">暫無相關新聞</div>}
             </div>
          ) : (
            // 其他面向：顯示說明項目
            <div className="space-y-2">
              {config.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 ${score >= 60 ? 'text-green-500' : 'text-gray-300'}`} />
                  <div>
                    <div className="text-sm font-bold text-gray-800">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 主程式 ---
export default function App() {
  const [formData, setFormData] = useState({ ticker: '', principal: 100000 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [rankingList, setRankingList] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [sidebarTab, setSidebarTab] = useState('rank'); // rank, portfolio, watch
  const [selectedAspect, setSelectedAspect] = useState(null);

  // 初始化載入
  useEffect(() => {
    const savedWatch = localStorage.getItem('watchlist');
    if(savedWatch) setWatchlist(JSON.parse(savedWatch));
    
    const savedPort = localStorage.getItem('portfolio');
    if(savedPort) setPortfolio(JSON.parse(savedPort));

    // 載入排行榜
    fetchRankings().then(setRankingList);
  }, []);

  const handleAnalyze = async (tickerOverride) => {
    const t = tickerOverride || formData.ticker;
    if(!t) return;
    
    setLoading(true); 
    setErrorMsg(''); 
    setData(null);

    try {
      const result = await fetchDepthAnalysis(t, formData.principal);
      setData(result);
    } catch (e) {
      console.error(e);
      setErrorMsg("伺服器連線失敗。請確認後端已部署且正在運行。");
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchlist = (t) => {
      const clean = t.toUpperCase();
      const list = watchlist.includes(clean) ? watchlist.filter(x=>x!==clean) : [...watchlist, clean];
      setWatchlist(list);
      localStorage.setItem('watchlist', JSON.stringify(list));
  };

  const handleBuy = () => {
      if(!data) return;
      const newPort = [...portfolio, { 
          ticker: data.ticker, 
          price: data.current_price, 
          shares: 1000, // 預設買一張
          cost: data.current_price * 1000,
          date: new Date().toLocaleDateString() 
      }];
      setPortfolio(newPort);
      localStorage.setItem('portfolio', JSON.stringify(newPort));
      setSidebarTab('portfolio');
      alert(`模擬買入成功！\n${data.ticker} 1000股 @ ${data.current_price}`);
  };

  const removePosition = (idx) => {
      const newPort = portfolio.filter((_, i) => i !== idx);
      setPortfolio(newPort);
      localStorage.setItem('portfolio', JSON.stringify(newPort));
  };

  const isWatched = watchlist.includes(formData.ticker.toUpperCase());

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 p-4">
      {/* Detail Modal */}
      {selectedAspect && (
        <DetailModal 
          aspectKey={selectedAspect} 
          data={data} 
          onClose={() => setSelectedAspect(null)} 
        />
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Analysis */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" /> AI 全能投資戰情室 (Full Pro)
            </h1>
            {data && (
              <span className="text-xs px-2 py-1 rounded border flex items-center gap-1 bg-green-50 text-green-700 border-green-200">
                <Wifi className="w-3 h-3"/> 後端已連線
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
                <select className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm">
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
              <div className="text-xs opacity-70">正在抓取 Yahoo Finance, 證交所 與 新聞數據...</div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center gap-3">
              <WifiOff className="w-6 h-6 shrink-0" />
              <div><div className="font-bold">連線失敗</div><div className="text-sm">{errorMsg}</div></div>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* Score & Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm text-center border-l-4 border-blue-500">
                  <div className="text-gray-400 text-xs font-bold mb-2">AI 綜合評分</div>
                  <div className={`text-6xl font-black ${data.total_score>=70?'text-green-600':(data.total_score<=40?'text-red-500':'text-yellow-500')}`}>
                    {data.total_score}
                  </div>
                  <div className="mt-2 font-bold text-gray-700">{data.evaluation}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col justify-center items-center relative">
                  <div className="text-gray-400 text-xs mb-1">目前股價</div>
                  <div className="text-3xl font-bold mb-3">${data.current_price}</div>
                  <button onClick={handleBuy} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors">
                    <PlusCircle className="w-4 h-4"/> 模擬買入 (1張)
                  </button>
                </div>
              </div>

              {/* Aspects Grid */}
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2 px-1"><Target className="w-4 h-4 text-blue-600"/> 深度面向 (點擊卡片查看詳情)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(ANALYSIS_CRITERIA).map(([key, config]) => (
                    <div 
                      key={key}
                      onClick={() => setSelectedAspect(key)}
                      className="bg-white p-3 rounded-xl border border-gray-100 transition-all cursor-pointer shadow-sm hover:shadow-md hover:border-blue-300 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-1 bg-gray-50 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-3 h-3 text-gray-400" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-gray-500 group-hover:text-gray-700 flex items-center gap-1">
                          <config.icon className="w-3.5 h-3.5" />
                          {config.title.split(' ')[0]}
                        </span>
                      </div>
                      <div className="flex items-end justify-between">
                        <div className={`text-2xl font-bold leading-none ${data.details[key]>=60?'text-green-600':(data.details[key]<=40?'text-red-500':'text-yellow-600')}`}>
                          {data.details[key]}
                        </div>
                        <div className="text-[10px] text-gray-400 font-medium">分</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* AI Commentary */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-2 mb-3">
                    <Bot className="w-5 h-5"/> AI 智能診斷報告
                </h4>
                <div className="text-sm text-gray-800 mb-3 leading-relaxed">
                    🔥 **{data.ticker}** 目前評分為 **{data.total_score}分**，屬於{data.evaluation}格局。
                    技術面 RSI 為 {data.tech_indicators?.rsi || '--'}，建議採取{data.recommendation}策略。
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle2 className="w-3 h-3 text-green-500"/>
                        <span>MA5 {data.tech_indicators?.ma5 > data.tech_indicators?.ma20 ? "大於" : "小於"} MA20 (短線趨勢)</span>
                    </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500"/> 真實走勢與預測</h3>
                <ResponsiveContainer width="100%" height="90%">
                  <AreaChart data={[...data.chart_data.history_date.map((d,i)=>({date:d, price:data.chart_data.history_price[i]})), ...data.chart_data.future_date.map((d,i)=>({date:d, mean:data.chart_data.future_mean[i]}))]}>
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

              {/* News */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Newspaper className="w-5 h-5 text-purple-500"/> 最新真實新聞</h3>
                <div className="space-y-3">
                  {data.news_list && data.news_list.length > 0 ? data.news_list.map((n, i) => (
                    <a key={i} href={n.link} target="_blank" rel="noreferrer" className="block p-3 border rounded-lg hover:shadow-md transition-all text-decoration-none group">
                      <div className="text-sm font-bold text-gray-800 mb-1 group-hover:text-blue-600 line-clamp-1">{n.title}</div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{n.publisher}</span>
                        <span>{n.time}</span>
                      </div>
                    </a>
                  )) : <div className="text-center text-gray-400 text-sm">暫無相關新聞</div>}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Right Panel: Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden">
             <div className="flex border-b">
                 <button onClick={()=>setSidebarTab('rank')} className={`flex-1 py-3 text-sm font-bold ${sidebarTab==='rank'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400'}`}>排行</button>
                 <button onClick={()=>setSidebarTab('portfolio')} className={`flex-1 py-3 text-sm font-bold ${sidebarTab==='portfolio'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400'}`}>資產</button>
                 <button onClick={()=>setSidebarTab('watch')} className={`flex-1 py-3 text-sm font-bold ${sidebarTab==='watch'?'text-blue-600 border-b-2 border-blue-600':'text-gray-400'}`}>自選</button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {/* 1. Ranking */}
               {sidebarTab === 'rank' && (
                   rankingList.length > 0 ? rankingList.map((item, i) => (
                       <div key={i} onClick={()=>handleAnalyze(item.ticker)} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                           <div className="flex items-center gap-3">
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold ${i<3?'bg-yellow-400':'bg-gray-300'}`}>{i+1}</div>
                               <div>
                                   <div className="font-bold text-gray-700">{item.ticker}</div>
                                   <div className="text-xs text-gray-400">${item.price} ({item.change_pct}%)</div>
                               </div>
                           </div>
                           <div className={`font-bold ${item.score>=70?'text-green-600':'text-gray-600'}`}>{item.score}分</div>
                       </div>
                   )) : <div className="text-center text-gray-400 mt-10">排行榜載入中...</div>
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
                        <div key={t} onClick={()=>handleAnalyze(t)} className="flex justify-between items-center p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
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
