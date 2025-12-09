import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Activity, BarChart2, PieChart, Newspaper, Zap, Search, ShieldCheck, Wifi, WifiOff, Target, RefreshCw, ExternalLink, HelpCircle, Star, Trash2, Bot, FileText, CheckCircle2, Wallet, X, Database, Microscope } from 'lucide-react';

// ⚠️ 請確認這是您 Render 後端的網址
const API_BASE_URL = "https://stock-backend-g011.onrender.com"; 

// --- 靜態顯示設定 ---
const ANALYSIS_CRITERIA = {
  fund: { 
    title: "基本面分析", 
    icon: PieChart, 
    color: "text-blue-600", 
    bg: "bg-blue-50",
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
    bg: "bg-purple-50", 
    desc: "透過量價走勢判斷時機",
    items: [
      { label: "RSI 相對強弱", desc: "判斷超買超賣 (30-70)" },
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
    bg: "bg-orange-50", 
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
    bg: "bg-green-50", 
    desc: "市場情緒與新聞",
    items: [
      { label: "新聞情緒", desc: "近期利多/利空消息" }
    ]
  }
};

// --- 詳細資訊視窗 (Modal) ---
const DetailModal = ({ aspectKey, data, onClose }) => {
  if (!aspectKey || !data) return null;
  const config = ANALYSIS_CRITERIA[aspectKey];
  const score = data.scores[aspectKey];
  // 取得後端傳來的精確技術指標
  const tech = data.tech_details || {};

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden transform transition-all scale-100" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${config.bg}`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-white ${config.color}`}><config.icon className="w-5 h-5"/></div>
            <div><h3 className={`text-lg font-bold ${config.color}`}>{config.title}</h3></div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
        </div>

        {/* Score */}
        <div className="p-6 text-center border-b border-gray-100">
          <div className="text-sm text-gray-400 font-bold mb-1">面向評分</div>
          <div className={`text-6xl font-black ${score>=70?'text-green-600':(score<=40?'text-red-500':'text-yellow-500')}`}>
            {score}
          </div>
          <div className="text-xs text-gray-400 mt-2 font-mono bg-gray-100 inline-block px-2 py-1 rounded">Source: Server-Side Calc</div>
        </div>

        {/* 詳細數據列表 */}
        <div className="p-4 bg-gray-50 max-h-[40vh] overflow-y-auto">
          {/* 如果是技術面，顯示真實運算數值 */}
          {aspectKey === 'tech' && tech.rsi ? (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-1"><span className="text-xs font-bold text-gray-500">RSI (14日)</span><span className={`font-mono font-bold ${tech.rsi>70?'text-red-500':(tech.rsi<30?'text-green-500':'text-gray-800')}`}>{tech.rsi}</span></div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{width: `${tech.rsi}%`}}></div></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                  <div className="text-[10px] text-gray-400">MACD</div>
                  <div className={`font-mono font-bold ${tech.macd>0?'text-red-500':'text-green-500'}`}>{tech.macd}</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-gray-200 text-center">
                  <div className="text-[10px] text-gray-400">KD (K值)</div>
                  <div className="font-mono font-bold text-gray-800">{tech.k}</div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-1">
                <div className="flex justify-between text-xs"><span>收盤價</span><span className="font-mono">{tech.price}</span></div>
                <div className="flex justify-between text-xs"><span>MA 5</span><span className="font-mono text-gray-500">{tech.ma5}</span></div>
                <div className="flex justify-between text-xs"><span>MA 20</span><span className="font-mono text-gray-500">{tech.ma20}</span></div>
                <div className="flex justify-between text-xs"><span>MA 60</span><span className="font-mono text-gray-500">{tech.ma60}</span></div>
              </div>
            </div>
          ) : (
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
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('myWatchlist');
    if (saved) setWatchlist(JSON.parse(saved));
  }, []);

  const handleAnalyze = async (tickerOverride) => {
    const t = tickerOverride || formData.ticker;
    if(!t) return;
    setLoading(true); setError(''); setData(null);

    try {
      // 直接呼叫後端，不做任何重試或計算，100% 信任後端
      const res = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t, principal: formData.principal })
      });
      
      if (!res.ok) throw new Error("無法連線至分析核心");
      const result = await res.json();
      setData(result);
    } catch (e) {
      setError("連線失敗，請檢查股票代碼或後端狀態。");
    } finally {
      setLoading(false);
    }
  };

  const toggleWatchlist = (t) => {
    const clean = t.toUpperCase();
    const list = watchlist.includes(clean) ? watchlist.filter(x=>x!==clean) : [...watchlist, clean];
    setWatchlist(list);
    localStorage.setItem('myWatchlist', JSON.stringify(list));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 p-4 font-sans">
      {modal && <DetailModal aspectKey={modal} data={data} onClose={()=>setModal(null)} />}

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 左側主要區塊 */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-blue-600"/> AI 全能投資戰情室 (Pro)</h1>
            {data && <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded border border-green-200 flex items-center gap-1"><Wifi className="w-3 h-3"/> 已連線至 Python 核心</span>}
          </div>

          {/* 搜尋列 */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5"/>
                <input 
                  value={formData.ticker} 
                  onChange={e=>setFormData({...formData, ticker: e.target.value})}
                  onKeyDown={e=>e.key==='Enter' && handleAnalyze()}
                  placeholder="輸入代碼 (例如 2330.TW)" 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none uppercase font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button onClick={()=>handleAnalyze()} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold disabled:bg-gray-400 transition-colors flex items-center gap-2">
                {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : <Zap className="w-5 h-5"/>}
                分析
              </button>
            </div>
          </div>

          {/* 錯誤訊息 */}
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 border border-red-100"><WifiOff size={20}/> {error}</div>}

          {/* 分析結果 */}
          {data && !loading && (
            <div className="space-y-6 animate-fade-in-up">
              
              {/* 綜合評分與建議 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm text-center relative overflow-hidden border border-gray-100">
                  <div className="text-sm text-gray-400 mb-2 font-bold uppercase tracking-wider">AI 綜合評分</div>
                  <div className={`text-7xl font-black ${data.total_score>=75?'text-green-600':(data.total_score<=40?'text-red-500':'text-yellow-500')}`}>
                    {data.total_score}
                  </div>
                  <div className="mt-2 font-bold text-gray-700 text-lg">{data.evaluation}</div>
                  <div className="absolute top-4 right-4 text-[10px] text-gray-300 border px-1 rounded">Verifiable</div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4 opacity-80"><Bot size={20}/> <span className="font-bold">AI 策略建議</span></div>
                  <div className="text-3xl font-bold mb-2">{data.recommendation}</div>
                  <div className="text-sm opacity-90 leading-relaxed">
                    目前股價 <span className="font-mono text-yellow-300 font-bold">${data.current_price}</span>。<br/>
                    技術指標顯示{data.scores.tech > 60 ? "多頭排列" : "空方勢力較強"}，
                    建議{data.total_score > 70 ? "分批佈局" : "暫時觀望"}。
                  </div>
                </div>
              </div>

              {/* 四大面向卡片 */}
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2 px-1"><Target className="w-4 h-4 text-blue-600"/> 深度面向分析 <span className="text-xs font-normal text-gray-400">(點擊卡片查看真實數據)</span></h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(ANALYSIS_CRITERIA).map(([key, cfg]) => (
                    <div key={key} onClick={()=>setModal(key)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-400 cursor-pointer transition-all hover:-translate-y-1 group">
                      <div className={`flex items-center gap-2 mb-3 font-bold text-xs text-gray-500 uppercase`}>
                        <cfg.icon size={14} className={cfg.color}/> {cfg.title.split(' ')[0]}
                      </div>
                      <div className="flex items-end justify-between">
                        <div className={`text-3xl font-bold ${data.scores[key]>=70?'text-green-600':(data.scores[key]<=40?'text-red-500':'text-yellow-500')}`}>{data.scores[key]}</div>
                        <div className="text-[10px] text-gray-300 group-hover:text-blue-400 transition-colors">詳情 &rarr;</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* K線圖 */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 h-[350px]">
                <div className="text-sm font-bold text-gray-500 mb-6 flex items-center gap-2"><Activity size={16}/> 真實走勢與 AI 預測軌跡</div>
                <ResponsiveContainer width="100%" height="85%">
                  <AreaChart data={[
                    ...data.chart_data.history_date.map((d,i)=>({date:d, price:data.chart_data.history_price[i]})),
                    ...data.chart_data.future_date.map((d,i)=>({date:d, mean:data.chart_data.future_mean[i], upper:data.chart_data.future_upper[i], lower:data.chart_data.future_lower[i]}))
                  ]}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                    <XAxis dataKey="date" tick={{fontSize:10, fill:'#9ca3af'}} minTickGap={40} axisLine={false} tickLine={false}/>
                    <YAxis domain={['auto','auto']} tick={{fontSize:10, fill:'#9ca3af'}} axisLine={false} tickLine={false} width={40}/>
                    <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                    <Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#colorPrice)" strokeWidth={2} name="歷史股價"/>
                    <Area type="monotone" dataKey="mean" stroke="#dc2626" strokeDasharray="5 5" fill="transparent" name="預測趨勢" dot={false}/>
                    <Area type="monotone" dataKey="upper" stroke="transparent" fill="#fee2e2" fillOpacity={0.5} name="預測區間"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>
          )}
        </div>

        {/* 右側：側邊欄 */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="font-bold text-gray-700 text-sm">自選觀察清單</span>
              <span className="text-xs text-gray-400">{watchlist.length} 檔</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {watchlist.length > 0 ? watchlist.map(t => (
                <div key={t} onClick={()=>handleAnalyze(t)} className="p-3 mb-2 border border-transparent hover:border-blue-100 hover:bg-blue-50 rounded-xl cursor-pointer transition-all flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-blue-200 group-hover:text-blue-700">TW</div>
                    <span className="font-bold text-gray-700">{t}</span>
                  </div>
                  <button onClick={e=>{e.stopPropagation();toggleWatchlist(t)}} className="p-2 hover:bg-white rounded-full text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-50">
                  <Star size={40}/>
                  <span className="text-xs">點擊星號加入自選股</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
