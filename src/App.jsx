import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Activity, Lock, BookOpen } from 'lucide-react';

// 設定 API 基礎網址，若在 Vercel 需指向後端 URL
// 開發時通常為 http://localhost:8000
const API_BASE_URL = "http://localhost:8000"; 

function App() {
  const [view, setView] = useState('analysis'); // analysis, login, portfolio
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  
  // 輸入狀態
  const [inputs, setInputs] = useState({
    symbol: '2330.TW',
    principal: 100000,
    strategy: '價值投資',
    duration: '60 日'
  });

  // 分析結果狀態
  const [result, setResult] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 登入表單狀態
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  // 模擬資產狀態
  const [portfolio, setPortfolio] = useState(null);

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (token) fetchPortfolio();
  }, [token, view]);

  // --- API 呼叫 ---
  const fetchNews = async () => {
    try {
      // 這裡如果後端沒開，可以 fallback 到假資料
      const res = await axios.get(`${API_BASE_URL}/api/news`);
      setNews(res.data);
    } catch (err) {
      console.log("News API error, using fallback");
      setNews([
        { time: "剛剛", title: "系統無法連接新聞伺服器", source: "System" }
      ]);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/analyze`, inputs);
      setResult(res.data);
      setView('analysis');
    } catch (err) {
      setError('分析失敗：請確認股票代碼正確或後端伺服器運作中。');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('username', authForm.username);
      formData.append('password', authForm.password);
      const res = await axios.post(`${API_BASE_URL}/token`, formData);
      const access_token = res.data.access_token;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      setUser(authForm.username);
      setView('analysis');
    } catch (err) {
      alert("登入失敗");
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API_BASE_URL}/register`, authForm);
      alert("註冊成功，請登入");
    } catch (err) {
      alert("註冊失敗");
    }
  };

  const fetchPortfolio = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPortfolio(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addToPortfolio = async () => {
    if (!token) {
      alert("請先登入");
      setView('login');
      return;
    }
    if (!result) return;
    try {
      await axios.post(`${API_BASE_URL}/api/portfolio/add`, {
        symbol: result.symbol,
        shares: result.money_management.max_shares,
        cost: result.price
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("已加入模擬投資組合");
      fetchPortfolio();
    } catch (err) {
      alert("加入失敗");
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setUser(null);
    setView('login');
  };

  // --- 畫面渲染組件 ---

  const renderAnalysis = () => (
    <div className="animate-fade-in">
      {/* 1. 輸入區 [cite: 2-15] */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <BookOpen className="mr-2" /> 投資參數設定
        </h2>
        <div className="grid-4">
          <div>
            <label className="text-sm text-gray-400">股票代碼</label>
            <input 
              value={inputs.symbol} 
              onChange={e => setInputs({...inputs, symbol: e.target.value})}
              placeholder="如: 2330.TW 或 AAPL"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">投入本金</label>
            <input 
              type="number"
              value={inputs.principal} 
              onChange={e => setInputs({...inputs, principal: Number(e.target.value)})}
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">策略</label>
            <select onChange={e => setInputs({...inputs, strategy: e.target.value})}>
              <option>價值投資</option>
              <option>波段交易</option>
              <option>動能策略</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" onClick={handleAnalyze} disabled={loading}>
              {loading ? "AI 分析中..." : "開始分析"}
            </button>
          </div>
        </div>
        {error && <p className="text-danger mt-2">{error}</p>}
      </div>

      {result && (
        <>
          {/* 3. AI 綜合評分 [cite: 20-24] */}
          <div className="grid-2">
            <div className="card text-center">
              <h3 className="text-gray-400 mb-4">AI 綜合評分</h3>
              <div className="score-circle" style={{ borderColor: result.ai_score >= 60 ? '#10b981' : '#ef4444' }}>
                {result.ai_score}
              </div>
              <p className="mt-2 text-xl font-bold">{result.ai_sentiment}</p>
              <p className="text-sm text-gray-500 mt-2">基於技術、基本、籌碼、消息面綜合分析</p>
            </div>

            {/* 6. 波段操作建議 [cite: 32-36] */}
            <div className="card">
              <h3 className="text-gray-400 mb-4">AI 操作建議</h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span>建議買入價</span>
                  <span className="font-bold text-xl">${result.advice.buy_price}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span>目標停利 (+20%)</span>
                  <span className="font-bold text-success">${result.advice.take_profit}</span>
                </div>
                <div className="flex justify-between">
                  <span>停損價格 (-10%)</span>
                  <span className="font-bold text-danger">${result.advice.stop_loss}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 10. 股價走勢 + AI 預測 [cite: 53-58] */}
          <div className="card">
            <h3 className="text-gray-400 mb-4 flex items-center">
              <TrendingUp className="mr-2" /> 股價走勢與 AI 預測區間
            </h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...result.chart_data.history, ...result.chart_data.prediction]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{fill: '#94a3b8'}} />
                  <YAxis domain={['auto', 'auto']} tick={{fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                  <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} name="歷史股價" dot={false} />
                  <Line type="monotone" dataKey="predicted_price" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" name="AI 預測" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center mt-4">
              {token ? (
                <button className="btn btn-outline" onClick={() => alert("進階 K 線功能開發中")}>查看 K 線詳細分析</button>
              ) : (
                <p className="text-sm text-gray-500">登入後可查看詳細 K 線與技術指標 [cite: 85]</p>
              )}
            </div>
          </div>

          {/* 4. 獲利預估 ROI [cite: 25-31] & 7. 資金配置 [cite: 37-41] */}
          <div className="grid-2">
            <div className="card">
              <h3 className="text-gray-400 mb-4">預期獲利 (ROI)</h3>
              <div className="grid-2 gap-4">
                {Object.entries(result.roi_estimates).map(([key, val]) => (
                  <div key={key} className="bg-slate-800 p-3 rounded">
                    <div className="text-sm text-gray-400 capitalize">{key}</div>
                    <div className="text-success font-bold">+{val.pct}%</div>
                    <div className="text-xs">NT$ {val.amt.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-gray-400 mb-4">資金配置與風險</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span>最大可買股數</span>
                  <b>{result.money_management.max_shares} 股</b>
                </li>
                <li className="flex justify-between">
                  <span>預估成本</span>
                  <b>${result.money_management.total_cost.toLocaleString()}</b>
                </li>
                <li className="flex justify-between text-danger">
                  <span>極端風險損失 (VaR 95%)</span>
                  <b>-${result.risk_analysis.max_loss_amt.toLocaleString()}</b>
                </li>
                <li className="mt-4">
                  <button className="btn btn-primary w-full" onClick={addToPortfolio}>
                    加入模擬投資組合
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </>
      )}

      {/* 2. 全球市場快訊 [cite: 16-19] */}
      <div className="card mt-4">
        <h3 className="text-gray-400 mb-4 flex items-center">
          <Activity className="mr-2" /> 市場快訊
        </h3>
        <div className="space-y-3">
          {news.map((n, i) => (
            <div key={i} className="border-l-4 border-accent pl-3 py-1">
              <div className="text-xs text-gray-500">{n.time} · {n.source}</div>
              <div className="font-medium hover:text-primary cursor-pointer">{n.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPortfolio = () => (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">模擬資產管理 [cite: 59]</h2>
      {portfolio ? (
        <>
          <div className="grid-4 mb-8">
            <div className="bg-slate-800 p-4 rounded">
              <div className="text-gray-400 text-sm">總資產</div>
              <div className="text-2xl font-bold">${portfolio.total_asset.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <div className="text-gray-400 text-sm">總成本</div>
              <div className="text-xl">${portfolio.total_cost.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800 p-4 rounded">
              <div className="text-gray-400 text-sm">未實現損益</div>
              <div className={`text-xl font-bold ${portfolio.unrealized_pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                ${portfolio.unrealized_pnl.toLocaleString()}
              </div>
            </div>
          </div>
          
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="py-2">代碼</th>
                <th>股數</th>
                <th>成本</th>
                <th>市值</th>
                <th>損益</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.holdings.map((stock, i) => (
                <tr key={i} className="border-b border-gray-800">
                  <td className="py-3 font-bold">{stock.symbol}</td>
                  <td>{stock.shares}</td>
                  <td>${stock.cost}</td>
                  <td>${stock.market_value}</td>
                  <td className={stock.pnl >= 0 ? 'text-success' : 'text-danger'}>
                    ${stock.pnl.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>載入中...</p>
      )}
    </div>
  );

  const renderLogin = () => (
    <div className="flex justify-center items-center h-[60vh]">
      <div className="card w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">會員登入 / 註冊</h2>
        <input 
          placeholder="帳號" 
          value={authForm.username}
          onChange={e => setAuthForm({...authForm, username: e.target.value})}
        />
        <input 
          type="password" 
          placeholder="密碼" 
          value={authForm.password}
          onChange={e => setAuthForm({...authForm, password: e.target.value})}
        />
        <button className="btn btn-primary w-full mt-4" onClick={handleLogin}>登入</button>
        <button className="btn btn-outline w-full mt-2" onClick={handleRegister}>註冊新帳號</button>
      </div>
    </div>
  );

  return (
    <div className="container">
      <nav className="navbar">
        <div className="text-2xl font-bold text-primary flex items-center">
          <Activity className="mr-2" /> AI Stock Master
        </div>
        <div className="nav-links">
          <button className={view === 'analysis' ? 'active' : ''} onClick={() => setView('analysis')}>
            股票分析
          </button>
          <button className={view === 'portfolio' ? 'active' : ''} onClick={() => token ? setView('portfolio') : setView('login')}>
            模擬資產
            {!token && <Lock size={12} className="inline ml-1 mb-1"/>}
          </button>
          {token ? (
            <button onClick={logout} className="text-danger">登出 ({user})</button>
          ) : (
            <button className={view === 'login' ? 'active' : ''} onClick={() => setView('login')}>
              登入
            </button>
          )}
        </div>
      </nav>

      {view === 'analysis' && renderAnalysis()}
      {view === 'portfolio' && renderPortfolio()}
      {view === 'login' && renderLogin()}
    </div>
  );
}

export default App;
