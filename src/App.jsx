import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { ShieldCheck, TrendingUp, PieChart, BarChart2, Newspaper, User, LogOut, Search, PlusCircle, Trash2, Wallet, Activity, AlertTriangle, Target, Calculator, Star, X, CheckCircle2, Lock, ArrowRight, ExternalLink } from 'lucide-react';

// ⚠️ 請確認這是您 Render 後端的網址 (不需要加 /api)
const API_BASE_URL = "https://stock-backend-g011.onrender.com"; 

// --- 詳細分析項目定義 ---
const ANALYSIS_CRITERIA = {
  fund: { 
    title: "基本面分析", icon: PieChart, color: "text-blue-600", bg: "bg-blue-50",
    desc: "EPS, ROE, 獲利能力",
    items: [
      { label: "EPS 成長性", desc: "每股盈餘是否逐季成長" },
      { label: "ROE 股東權益報酬", desc: "資金運用效率 (>15% 優)" },
      { label: "本益比位階", desc: "股價是否被高估" }
    ]
  },
  tech: { 
    title: "技術面分析", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50",
    desc: "RSI, MACD, 均線",
    items: [
      { label: "RSI 相對強弱", desc: "判斷超買/超賣區間" },
      { label: "MACD 趨勢", desc: "多空趨勢判斷" },
      { label: "均線排列", desc: "多頭/空頭排列確認" },
      { label: "布林通道", desc: "股價波動壓縮與突破" }
    ]
  },
  chip: { 
    title: "籌碼面分析", icon: BarChart2, color: "text-orange-600", bg: "bg-orange-50",
    desc: "法人買賣超",
    items: [
      { label: "外資動向", desc: "國際資金流向" },
      { label: "投信佈局", desc: "國內法人作帳行情" },
      { label: "主力進出", desc: "關鍵分點籌碼分析" }
    ]
  },
  news: { 
    title: "消息面分析", icon: Newspaper, color: "text-green-600", bg: "bg-green-50",
    desc: "新聞情緒與熱度",
    items: [
      { label: "重大新聞", desc: "財報、法說會、產品發表" },
      { label: "市場情緒", desc: "恐懼與貪婪指數" }
    ]
  }
};

// --- 登入畫面 ---
const LoginView = ({ onLogin }) => {
  const [isReg, setIsReg] = useState(false);
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const url = isReg ? '/auth/register' : '/auth/login';
    try {
      // 登入是用 Form Data，註冊是用 JSON
      const body = isReg 
        ? JSON.stringify({ username: u, password: p }) 
        : new URLSearchParams({ username: u, password: p });
      
      const headers = isReg 
        ? {'Content-Type': 'application/json'} 
        : {'Content-Type': 'application/x-www-form-urlencoded'};

      const res = await fetch(`${API_BASE_URL}${url}`, { method: 'POST', headers, body });
      
      if (!res.ok) {
          const errorData = await res.json().catch(()=>({}));
          throw new Error(errorData.detail || "認證失敗");
      }
      
      if (isReg) { 
          alert("註冊成功，請登入"); 
          setIsReg(false); 
      } else { 
          const data = await res.json(); 
          onLogin(data.access_token, u); 
      }
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
             <ShieldCheck className="w-8 h-8 text-blue-600"/>
          </div>
          <h2 className="text-xl font-bold text-gray-800">AI 投資戰情室</h2>
          <p className="text-sm text-gray-500 mt-1">{isReg ? "建立您的 SRS 帳戶" : "登入以存取資產數據"}</p>
        </div>
        {err && <div className="bg-red-50 text-red-600 p-3 text-sm rounded-lg mb-4 flex items-center gap-2"><AlertTriangle size={14}/> {err}</div>}
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="使用者帳號" value={u} onChange={e=>setU(e.target.value)} required/>
          <input className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition" type="password" placeholder="密碼" value={p} onChange={e=>setP(e.target.value)} required/>
          <button disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:bg-gray-300">
            {loading ? "處理中..." : (isReg ? "註冊帳號" : "立即登入")}
          </button>
        </form>
        <button onClick={()=>setIsReg(!isReg)} className="w-full text-center text-sm text-gray-500 mt-6 hover:text-blue-600 transition">
          {isReg ? "已有帳號? 返回登入" : "還沒有帳號? 免費註冊"}
        </button>
      </div>
    </div>
  );
};

// --- 詳細資訊 Modal ---
const DetailModal = ({ aspectKey, data, onClose }) => {
  if (!data) return null;
  const config = ANALYSIS_CRITERIA[aspectKey];
  const score = data.scores[aspectKey];
  const indicators = aspectKey === 'tech' ? data.tech_details : {};

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-scale-up shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className={`p-4 border-b flex justify-between items-center ${config.bg}`}>
          <div className="flex items-center gap-2 font-bold text-lg"><config.icon className="w-5 h-5"/> {config.title}</div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500"/></button>
        </div>
        
        <div className="p-6 text-center border-b border-gray-100">
            <div className={`text-6xl font-black ${score>=70?'text-green-600':(score<=40?'text-red-500':'text-yellow-500')}`}>{score}</div>
            <div className="text-gray-400 text-xs mt-2 font-bold">SRS 模型評分</div>
        </div>

        <div className="p-4 bg-gray-50 max-h-[40vh] overflow-y-auto custom-scrollbar">
          {aspectKey === 'tech' && indicators ? (
            <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2"><span>RSI (14)</span><span className={`font-mono font-bold ${indicators.rsi>70?'text-red-500':(indicators.rsi<30?'text-green-500':'')}`}>{indicators.rsi}</span></div>
                <div className="flex justify-between border-b pb-2"><span>MACD</span><span className="font-mono font-bold">{indicators.macd}</span></div>
                <div className="flex justify-between border-b pb-2"><span>MA (20)</span><span className="font-mono font-bold">{indicators.ma20}</span></div>
                <div className="flex justify-between border-b pb-2"><span>MA (60)</span><span className="font-mono font-bold">{indicators.ma60}</span></div>
                <div className="flex justify-between pt-1"><span>KD (K值)</span><span className="font-mono font-bold">{indicators.k}</span></div>
            </div>
          ) : (
             <div className="space-y-2">
                 {config.items.map((item, i) => (
                     <div key={i} className="flex items-start gap-2 p-2 bg-white rounded border border-gray-100">
                         <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5"/>
                         <div>
                             <div className="text-sm font-bold text-gray-700">{item.label}</div>
                             <div className="text-xs text-gray-400">{item.desc}</div>
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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [view, setView] = useState('analysis');
  
  const [ticker, setTicker] = useState('');
  const [principal, setPrincipal] = useState(100000);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [ranking, setRanking] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [modal, setModal] = useState(null);

  // Auth Fetch Wrapper
  const authFetch = async (endpoint, opts={}) => {
    const headers = { ...opts.headers, 'Authorization': `Bearer ${token}` };
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...opts, headers });
        if (res.status === 401) { logout(); return null; }
        return res;
    } catch(e) {
        throw e;
    }
  };

  const logout = () => {
    localStorage.clear(); setToken(null); setUser(null);
  };

  // 初始化資料
  useEffect(() => {
    if (token) {
      loadUserData();
      // 載入排行榜 (不用 token 也可以，但後端設計了 token 驗證)
      authFetch('/api/rankings').then(r => r && r.ok && r.json().then(setRanking));
    }
  }, [token]);

  const loadUserData = () => {
      authFetch('/api/favorites').then(r=>r && r.ok && r.json().then(setFavorites));
      authFetch('/api/portfolio').then(r=>r && r.ok && r.json().then(setPortfolio));
  };

  const handleAnalyze = async (targetTicker) => {
    const t = targetTicker || ticker;
    if (!t) return;
    setLoading(true); setErrorMsg('');
    try {
      const res = await authFetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ symbol: t, principal: Number(principal) })
      });
      
      if (res && res.ok) {
        const result = await res.json();
        setData(result);
        setView('analysis');
      } else {
        const err = await res.json().catch(()=>({}));
        setErrorMsg(err.detail || "分析失敗，請檢查代碼");
      }
    } catch(e) { 
        setErrorMsg("連線錯誤，請確認後端是否運行中"); 
    } finally { 
        setLoading(false); 
    }
  };

  const toggleFav = async (sym) => {
    if(!sym) return;
    const method = favorites.includes(sym) ? 'DELETE' : 'POST';
    await authFetch(`/api/favorites/${sym}`, { method });
    loadUserData();
  };

  const addToPort = async () => {
    if (!data) return;
    const shares = Math.floor(principal / data.current_price);
    const res = await authFetch('/api/portfolio/add', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ 
          symbol: data.symbol, 
          cost_price: data.current_price, 
          shares, 
          date: new Date().toISOString().split('T')[0] 
      })
    });
    if(res && res.ok) {
        alert(`已將 ${data.symbol} 加入資產 (模擬買入 ${shares} 股)`);
        loadUserData();
    }
  };

  const removePort = async (sym) => {
    await authFetch(`/api/portfolio/${sym}`, { method: 'DELETE' });
    loadUserData();
  };

  if (!token) return <LoginView onLogin={(t, u) => { setToken(t); setUser(u); localStorage.setItem('token', t); localStorage.setItem('user', u); }} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-20 lg:pb-0">
      {modal && <DetailModal aspectKey={modal} data={data} onClose={()=>setModal(null)} />}

      {/* Navbar */}
      <nav className="bg-white px-4 py-3 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="font-bold text-lg flex items-center gap-2"><ShieldCheck className="text-blue-600"/> 戰情室 <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded border">PRO</span></div>
        
        {/* Desktop Menu */}
        <div className="hidden lg:flex gap-1 text-sm font-bold bg-gray-100 p-1 rounded-lg">
          {['analysis', 'portfolio', 'watchlist'].map(v => (
              <button key={v} onClick={()=>setView(v)} className={`px-4 py-1.5 rounded-md transition-all ${view===v ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {v === 'analysis' ? '智能分析' : (v === 'portfolio' ? '資產管理' : '收藏清單')}
              </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 hidden sm:block">Hi, {user}</span>
            <button onClick={logout} className="p-2 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-500 transition"><LogOut size={18}/></button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-6">
          
          {view === 'analysis' && (
            <>
              {/* Input Area */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-gray-400 ml-1">股票代碼</label>
                  <div className="relative">
                    <input value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} className="w-full p-3 bg-gray-50 border-gray-200 border rounded-xl font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none" placeholder="輸入代碼 (2330.TW)"/>
                    <button onClick={()=>toggleFav(ticker)} className={`absolute right-3 top-3 transition ${favorites.includes(ticker)?'text-yellow-400 fill-yellow-400':'text-gray-300 hover:text-yellow-400'}`}><Star size={20}/></button>
                  </div>
                </div>
                <div className="w-full sm:w-32">
                  <label className="text-xs font-bold text-gray-400 ml-1">本金</label>
                  <input type="number" value={principal} onChange={e=>setPrincipal(e.target.value)} className="w-full p-3 bg-gray-50 border-gray-200 border rounded-xl outline-none"/>
                </div>
                <button onClick={()=>handleAnalyze()} disabled={loading} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl font-bold disabled:bg-gray-300 hover:bg-blue-700 transition shadow-sm flex justify-center items-center gap-2">
                  {loading ? <RefreshCw className="animate-spin w-5 h-5"/> : <Zap className="w-5 h-5"/>} 分析
                </button>
              </div>

              {errorMsg && <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2"><AlertTriangle size={18}/> {errorMsg}</div>}

              {data && !loading && (
                <div className="animate-fade-in-up space-y-6">
                  {/* Score Card (SRS #3) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500 relative overflow-hidden">
                      <div className="flex justify-between items-start z-10 relative">
                          <div>
                              <div className="text-xs text-gray-400 font-bold mb-1">AI 綜合評分</div>
                              <div className="flex items-baseline gap-2">
                                  <div className={`text-6xl font-black ${data.ai_score>=70?'text-green-500':(data.ai_score<=40?'text-red-500':'text-yellow-500')}`}>{data.ai_score}</div>
                                  <div className="text-xl font-bold text-gray-600">{data.evaluation}</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-xs text-gray-400 font-bold mb-1">目前股價</div>
                              <div className="text-3xl font-bold text-gray-800">${data.current_price}</div>
                          </div>
                      </div>
                      <div className="absolute -right-6 -bottom-6 opacity-5"><Activity size={150}/></div>
                    </div>

                    {/* Strategy Card (SRS #6) */}
                    <div className="bg-gradient-to-br from-slate-800 to-black text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-yellow-400 font-bold mb-4"><Target size={18}/> 波段操作建議</div>
                            <div className="flex justify-between text-center">
                                <div><div className="text-[10px] opacity-60 uppercase">Entry</div><div className="text-xl font-bold">${data.strategy.entry}</div></div>
                                <div><div className="text-[10px] opacity-60 uppercase">TP (獲利)</div><div className="text-xl font-bold text-green-400">${data.strategy.take_profit}</div></div>
                                <div><div className="text-[10px] opacity-60 uppercase">SL (止損)</div><div className="text-xl font-bold text-red-400">${data.strategy.stop_loss}</div></div>
                            </div>
                        </div>
                        <button onClick={addToPort} className="mt-4 w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 transition flex items-center justify-center gap-2 text-sm font-bold">
                            <PlusCircle size={16}/> 加入模擬投資組合
                        </button>
                    </div>
                  </div>

                  {/* Aspects Grid (SRS #9) */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(ANALYSIS_CRITERIA).map(([key, cfg]) => (
                        <div key={key} onClick={()=>setModal(key)} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer group">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-2">
                                <cfg.icon size={14} className={cfg.color}/> {cfg.title}
                            </div>
                            <div className={`text-2xl font-bold ${data.scores[key]>=70?'text-green-600':'text-gray-700'}`}>{data.scores[key]}</div>
                            <div className="text-[10px] text-gray-300 group-hover:text-blue-500 mt-1 flex items-center gap-1">查看細節 <ArrowRight size={10}/></div>
                        </div>
                    ))}
                  </div>

                  {/* Risk & ROI (SRS #4, #8) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                          <div className="flex items-center gap-2 text-red-800 font-bold mb-2 text-sm"><AlertTriangle size={16}/> 風險預警 (VaR 95%)</div>
                          <div className="text-xs text-red-600/80 mb-1">有 5% 機率單日虧損超過</div>
                          <div className="text-xl font-bold text-red-700">-${data.risk.max_loss_est}</div>
                      </div>
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold mb-2 text-sm"><Activity size={16}/> 歷史 ROI 表現</div>
                          <div className="flex justify-between text-center text-xs">
                              <div className="bg-white/60 p-1.5 rounded w-full mr-1">1週<br/><span className={data.roi['1w']>=0?'text-red-500':'text-green-600'}>{data.roi['1w']}%</span></div>
                              <div className="bg-white/60 p-1.5 rounded w-full mr-1">1月<br/><span className={data.roi['1m']>=0?'text-red-500':'text-green-600'}>{data.roi['1m']}%</span></div>
                              <div className="bg-white/60 p-1.5 rounded w-full">1年<br/><span className={data.roi['1y']>=0?'text-red-500':'text-green-600'}>{data.roi['1y']}%</span></div>
                          </div>
                      </div>
                  </div>

                  {/* Chart (SRS #10) */}
                  <div className="bg-white p-4 rounded-2xl shadow-sm h-[320px] border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2"><Activity size={16}/> 股價走勢</h3>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">MA20: 趨勢線</div>
                      </div>
                      <ResponsiveContainer width="100%" height="85%">
                          <AreaChart data={data.chart_data.history_date.map((d,i)=>({date:d, price:data.chart_data.history_price[i]}))}>
                              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
                              <XAxis dataKey="date" hide/>
                              <YAxis domain={['auto','auto']} hide/>
                              <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                              <Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#g)" strokeWidth={2}/>
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>

                  {/* Patterns (SRS #15) */}
                  {data.patterns.length > 0 && (
                      <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl text-sm flex items-center gap-2">
                          <Microscope size={16}/>
                          <span className="font-bold">偵測型態：</span>
                          {data.patterns.join("、")}
                      </div>
                  )}

                  {/* News (SRS #2) */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="font-bold text-gray-700 text-sm mb-3 flex items-center gap-2"><Newspaper size={16}/> 真實新聞快訊</h3>
                      <div className="space-y-3">
                          {data.news_list && data.news_list.map((n,i)=>(
                              <a key={i} href={n.link} target="_blank" rel="noreferrer" className="block p-3 border rounded-xl hover:shadow-md transition bg-gray-50/50 hover:bg-white text-decoration-none">
                                  <div className="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{n.title}</div>
                                  <div className="text-xs text-gray-400 flex justify-between">
                                      <span>{n.publisher}</span>
                                      <ExternalLink size={12}/>
                                  </div>
                              </a>
                          ))}
                      </div>
                  </div>

                </div>
              )}
            </>
          )}

          {view === 'portfolio' && (
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Wallet className="text-blue-600"/> 我的資產 (SRS #12)</h2>
                    <div className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold">總持倉: {portfolio.length}</div>
                 </div>
                 <div className="space-y-3">
                    {portfolio.map((p, i) => (
                        <div key={i} className="p-4 border rounded-2xl flex justify-between items-center hover:bg-gray-50 transition">
                            <div>
                                <div className="font-bold text-lg text-gray-800">{p.symbol}</div>
                                <div className="text-xs text-gray-500 mt-1">成本 ${p.cost_price} | {p.shares} 股</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-gray-800">${(p.cost_price * p.shares).toLocaleString()}</div>
                                <button onClick={()=>removePort(p.symbol)} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded mt-1 transition">賣出</button>
                            </div>
                        </div>
                    ))}
                    {portfolio.length === 0 && <div className="text-center py-20 text-gray-400">尚無資產，請至分析頁面添加。</div>}
                 </div>
             </div>
          )}

          {view === 'watchlist' && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Star className="text-yellow-400 fill-yellow-400"/> 收藏清單 (SRS #14)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {favorites.map(f => (
                          <div key={f} onClick={()=>{setTicker(f); setView('analysis'); handleAnalyze(f);}} className="p-4 border rounded-2xl flex justify-between items-center cursor-pointer hover:shadow-md transition hover:border-blue-300">
                              <span className="font-bold text-lg text-gray-700">{f}</span>
                              <button onClick={(e)=>{e.stopPropagation(); toggleFav(f)}} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                      ))}
                      {favorites.length === 0 && <div className="text-center py-20 text-gray-400 col-span-2">尚無收藏</div>}
                  </div>
              </div>
          )}

        </div>

        {/* Right Panel: Ranking */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[600px] flex flex-col overflow-hidden sticky top-24">
               <div className="p-4 border-b bg-gray-50/50 font-bold text-gray-700 flex items-center gap-2">
                   <Activity size={16} className="text-red-500"/> 市場熱門排行
               </div>
               <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                   {ranking.length > 0 ? ranking.map((r, i) => (
                       <div key={i} onClick={()=>{setTicker(r.ticker); setView('analysis'); handleAnalyze(r.ticker);}} className="flex justify-between items-center p-3 border border-transparent hover:border-blue-100 hover:bg-blue-50 rounded-xl cursor-pointer transition group">
                           <div className="flex items-center gap-3">
                               <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i<3 ? 'bg-yellow-400' : 'bg-gray-300'}`}>{i+1}</div>
                               <div>
                                   <div className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition">{r.ticker}</div>
                                   <div className="text-xs text-gray-400">${r.price}</div>
                               </div>
                           </div>
                           <div className={`font-bold text-sm ${r.change_pct >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                               {r.change_pct > 0 ? '+' : ''}{r.change_pct}%
                           </div>
                       </div>
                   )) : <div className="text-center py-10 text-gray-400 text-xs">排行載入中...</div>}
               </div>
           </div>
        </div>

      </div>
      
      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 z-30 pb-safe">
        <button onClick={()=>setView('analysis')} className={`flex flex-col items-center text-xs ${view==='analysis'?'text-blue-600':'text-gray-400'}`}><Search size={20}/><span>分析</span></button>
        <button onClick={()=>setView('portfolio')} className={`flex flex-col items-center text-xs ${view==='portfolio'?'text-blue-600':'text-gray-400'}`}><Wallet size={20}/><span>資產</span></button>
        <button onClick={()=>setView('watchlist')} className={`flex flex-col items-center text-xs ${view==='watchlist'?'text-blue-600':'text-gray-400'}`}><Star size={20}/><span>收藏</span></button>
      </div>
    </div>
  );
}
