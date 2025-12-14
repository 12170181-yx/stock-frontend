import React, { useEffect, useState } from "react";

// 簡單的數字格式化
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toLocaleString("zh-TW", {
    maximumFractionDigits: 2,
  });
}

function App() {
  // ===== 使用者登入狀態 =====
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // ===== 輸入區狀態 =====
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [strategy, setStrategy] = useState("none"); // 無（不限）
  const [duration, setDuration] = useState("mid"); // day / short / mid / long
  const [isFavorite, setIsFavorite] = useState(false);

  // ===== 分析結果 =====
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);

  // ROI tab（顯示哪一個時間區間）
  const [roiTab, setRoiTab] = useState("mid"); // day / short / mid / long

  // ===== 新聞 =====
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // ===== 收藏清單 =====
  const [favorites, setFavorites] = useState([]);

  // ===== 模擬資產 =====
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");

  // ===== K 線詳細分析 =====
  const [klineData, setKlineData] = useState(null);
  const [klineLoading, setKlineLoading] = useState(false);
  const [klineError, setKlineError] = useState("");

  // --------------------------------------
  // 初始：從 localStorage 載入 token
  // --------------------------------------
  useEffect(() => {
    const savedToken = window.localStorage.getItem("stock_token");
    const savedUser = window.localStorage.getItem("stock_username");
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) setUsername(savedUser);
    }
  }, []);

  // --------------------------------------
  // 取得全球市場快訊
  // --------------------------------------
  useEffect(() => {
    async function fetchNews() {
      try {
        setNewsLoading(true);
        const res = await fetch("/api/news");
        if (!res.ok) throw new Error("無法取得市場新聞");
        const data = await res.json();
        setNewsList(data);
      } catch (err) {
        console.error(err);
      } finally {
        setNewsLoading(false);
      }
    }
    fetchNews();
  }, []);

  // --------------------------------------
  // 若已登入，載入收藏清單
  // --------------------------------------
  useEffect(() => {
    if (!token) return;
    fetchFavorites();
  }, [token]);

  async function fetchFavorites() {
    try {
      const res = await fetch("/api/favorites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("取得收藏清單失敗");
      const data = await res.json();
      setFavorites(data.favorites || []);
      // 檢查目前 symbol 是否已收藏
      setIsFavorite(data.favorites?.includes(symbol.toUpperCase()));
    } catch (err) {
      console.error(err);
    }
  }

  // symbol 改變時，重新判斷是否已收藏
  useEffect(() => {
    setIsFavorite(favorites.includes(symbol.toUpperCase()));
  }, [symbol, favorites]);

  // --------------------------------------
  // 登入 / 登出 / 註冊
  // --------------------------------------
  async function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const body = new URLSearchParams();
      body.append("username", loginUsername);
      body.append("password", loginPassword);

      const res = await fetch("/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      if (!res.ok) {
        throw new Error("登入失敗，帳號或密碼錯誤");
      }

      const data = await res.json();
      setToken(data.access_token);
      setUsername(loginUsername);
      window.localStorage.setItem("stock_token", data.access_token);
      window.localStorage.setItem("stock_username", loginUsername);
      setLoginPassword("");
    } catch (err) {
      setAuthError(err.message || "登入發生錯誤");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUsername("");
    window.localStorage.removeItem("stock_token");
    window.localStorage.removeItem("stock_username");
  }

  async function handleRegister(e) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: registerUsername,
          password: registerPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "註冊失敗");
      }

      alert("註冊成功，請使用新帳號登入！");
      setLoginUsername(registerUsername);
      setRegisterPassword("");
    } catch (err) {
      setAuthError(err.message || "註冊發生錯誤");
    } finally {
      setAuthLoading(false);
    }
  }

  // --------------------------------------
  // 呼叫 /api/analyze 進行 AI 分析
  // --------------------------------------
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);

    // 將 duration 轉成描述文字，後端目前只收字串
    let durationLabel = "中期(60日)";
    if (duration === "day") durationLabel = "當沖(1日)";
    else if (duration === "short") durationLabel = "短期(5日)";
    else if (duration === "long") durationLabel = "長期(1年)";

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: symbol.trim(),
          principal: Number(principal),
          strategy,
          duration: durationLabel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "分析失敗");
      }

      const data = await res.json();
      setAnalysisResult(data);
      // 預設 ROI tab 跟持有時間對應
      if (duration === "day") setRoiTab("day");
      else if (duration === "short") setRoiTab("short");
      else if (duration === "mid") setRoiTab("mid");
      else setRoiTab("long");
    } catch (err) {
      setAnalysisError(err.message || "分析過程發生錯誤");
    } finally {
      setAnalyzing(false);
    }
  }

  // --------------------------------------
  // 收藏 / 取消收藏
  // --------------------------------------
  async function toggleFavorite() {
    if (!token) {
      alert("請先登入後才能收藏股票");
      return;
    }
    try {
      const api = isFavorite ? "/api/favorites/remove" : "/api/favorites/add";
      const res = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase() }),
      });
      if (!res.ok) throw new Error("更新收藏失敗");
      await fetchFavorites();
    } catch (err) {
      console.error(err);
      alert("更新收藏失敗");
    }
  }

  // --------------------------------------
  // 取得模擬資產
  // --------------------------------------
  async function loadPortfolio() {
    if (!token) {
      alert("請先登入，才能查看模擬資產");
      return;
    }
    setPortfolioLoading(true);
    setPortfolioError("");
    try {
      const res = await fetch("/api/portfolio", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("無法取得模擬資產");
      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      setPortfolioError(err.message || "取得模擬資產失敗");
    } finally {
      setPortfolioLoading(false);
    }
  }

  // --------------------------------------
  // 取得 K 線詳細分析
  // --------------------------------------
  async function loadKlineDetail() {
    if (!token) {
      alert("請先登入，才能查看 K 線詳細分析");
      return;
    }
    if (!symbol.trim()) {
      alert("請先輸入股票代碼");
      return;
    }

    setKlineLoading(true);
    setKlineError("");
    setKlineData(null);
    try {
      const url = `/api/kline-detail?symbol=${encodeURIComponent(
        symbol.trim()
      )}&interval=1d`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "取得 K 線資料失敗");
      }
      const data = await res.json();
      setKlineData(data);
    } catch (err) {
      setKlineError(err.message || "取得 K 線資料失敗");
    } finally {
      setKlineLoading(false);
    }
  }

  // --------------------------------------
  // 前端 UI
  // --------------------------------------

  return (
    <div className="app-root">
      {/* 頂部列：標題 + 登入區 */}
      <header className="app-header">
        <div className="app-title">
          <span role="img" aria-label="chart">
            📈
          </span>{" "}
          AI 投資戰情室
        </div>
        <div className="auth-area">
          {token ? (
            <>
              <span className="auth-user">Hi, {username}</span>
              <button className="btn secondary" onClick={handleLogout}>
                登出
              </button>
            </>
          ) : (
            <>
              <form className="auth-form" onSubmit={handleLogin}>
                <input
                  type="text"
                  placeholder="帳號"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="密碼"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button className="btn primary" type="submit" disabled={authLoading}>
                  {authLoading ? "登入中..." : "登入"}
                </button>
              </form>
            </>
          )}
        </div>
      </header>

      {/* 註冊區（簡單放在上方） */}
      {!token && (
        <section className="card auth-register">
          <h3>還沒有帳號？快速註冊</h3>
          <form className="auth-form" onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="新帳號"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="新密碼"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
            />
            <button className="btn secondary" type="submit" disabled={authLoading}>
              {authLoading ? "送出中..." : "註冊"}
            </button>
          </form>
          {authError && <div className="error-text">{authError}</div>}
        </section>
      )}

      {/* 主內容區：左邊戰情室 / 右邊新聞 & 收藏 */}
      <main className="app-main">
        <div className="left-panel">
          {/* 1. 輸入區 */}
          <section className="card input-card">
            <h2>輸入參數</h2>
            <div className="form-row">
              <label>股票代碼或名稱</label>
              <div className="symbol-row">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="如 2330.TW"
                />
                <button
                  type="button"
                  className={`favorite-btn ${isFavorite ? "active" : ""}`}
                  onClick={toggleFavorite}
                  title={token ? "收藏 / 取消收藏" : "需登入才能收藏"}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label>本金金額（TWD）</label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                min={0}
              />
            </div>

            <div className="form-row">
              <label>交易策略</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="none">無（不限）</option>
                <option value="value">價值投資</option>
                <option value="swing">波段交易</option>
                <option value="momentum">動能策略</option>
                <option value="growth">成長股策略</option>
                <option value="dividend">高股息策略</option>
                <option value="trend">趨勢追蹤</option>
              </select>
            </div>

            <div className="form-row">
              <label>預計持有時間</label>
              <div className="duration-tabs">
                <button
                  type="button"
                  className={duration === "day" ? "tab active" : "tab"}
                  onClick={() => setDuration("day")}
                >
                  當沖（1 日）
                </button>
                <button
                  type="button"
                  className={duration === "short" ? "tab active" : "tab"}
                  onClick={() => setDuration("short")}
                >
                  短期（5 日）
                </button>
                <button
                  type="button"
                  className={duration === "mid" ? "tab active" : "tab"}
                  onClick={() => setDuration("mid")}
                >
                  中期（60 日）
                </button>
                <button
                  type="button"
                  className={duration === "long" ? "tab active" : "tab"}
                  onClick={() => setDuration("long")}
                >
                  長期（1 年）
                </button>
              </div>
            </div>

            <div className="form-row">
              <button
                className="btn primary full"
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? "分析中..." : "⚡ 開始分析"}
              </button>
            </div>
            {analysisError && <div className="error-text">{analysisError}</div>}
          </section>

          {/* 2. 分析結果區（只有在有結果時顯示） */}
          {analysisResult && (
            <>
              {/* AI 綜合評分 */}
              <section className="card">
                <h2>AI 綜合評分</h2>
                <div className="ai-score-row">
                  <div className="ai-score-circle">
                    <span className="ai-score-value">
                      {analysisResult.ai_score}
                    </span>
                    <span className="ai-score-label">分</span>
                  </div>
                  <div className="ai-score-text">
                    <div className="ai-score-sentiment">
                      建議傾向：{analysisResult.ai_sentiment}
                    </div>
                    <div className="ai-score-sub">
                      股票：{analysisResult.symbol}，現價約{" "}
                      {formatNumber(analysisResult.price)} 元
                    </div>
                  </div>
                </div>

                {/* 四大面向 */}
                <div className="score-grid">
                  <div className="score-item">
                    <span>技術面</span>
                    <strong>{analysisResult.score_breakdown.technical}</strong>
                  </div>
                  <div className="score-item">
                    <span>基本面</span>
                    <strong>{analysisResult.score_breakdown.fundamental}</strong>
                  </div>
                  <div className="score-item">
                    <span>籌碼面</span>
                    <strong>{analysisResult.score_breakdown.chip}</strong>
                  </div>
                  <div className="score-item">
                    <span>消息面</span>
                    <strong>{analysisResult.score_breakdown.news}</strong>
                  </div>
                </div>
              </section>

              {/* ROI 模組 */}
              <section className="card">
                <h2>獲利預估（ROI）</h2>
                <div className="roi-tabs">
                  <button
                    className={roiTab === "day" ? "tab active" : "tab"}
                    onClick={() => setRoiTab("day")}
                  >
                    當沖（1 日）
                  </button>
                  <button
                    className={roiTab === "short" ? "tab active" : "tab"}
                    onClick={() => setRoiTab("short")}
                  >
                    短期（5 日）
                  </button>
                  <button
                    className={roiTab === "mid" ? "tab active" : "tab"}
                    onClick={() => setRoiTab("mid")}
                  >
                    中期（60 日）
                  </button>
                  <button
                    className={roiTab === "long" ? "tab active" : "tab"}
                    onClick={() => setRoiTab("long")}
                  >
                    長期（1 年）
                  </button>
                </div>

                {(() => {
                  const roi = analysisResult.roi_estimates;
                  let label = "";
                  let data = null;
                  if (roiTab === "day") {
                    label = "當沖（1 日）";
                    data = roi.day;
                  } else if (roiTab === "short") {
                    label = "短期（5 日）";
                    data = roi.week;
                  } else if (roiTab === "mid") {
                    label = "中期（60 日）";
                    data = roi.month;
                  } else {
                    label = "長期（1 年）";
                    data = roi.year;
                  }
                  return (
                    <div className="roi-panel">
                      <div className="roi-label">{label}</div>
                      <div className="roi-value">
                        預估報酬率：約{" "}
                        <strong>{formatNumber(data.pct)}%</strong>
                      </div>
                      <div className="roi-value">
                        以目前配置計算，預估獲利約{" "}
                        <strong>{formatNumber(data.amt)} 元</strong>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* 波段操作建議價位 & 資金配置 */}
              <section className="card">
                <h2>波段操作建議 & 資金配置</h2>
                <div className="two-column">
                  <div>
                    <h3>波段操作建議價位</h3>
                    <ul className="price-list">
                      <li>
                        建議買入價：{" "}
                        <strong>
                          {formatNumber(analysisResult.advice.buy_price)}
                        </strong>
                      </li>
                      <li>
                        停利目標（+20%）：{" "}
                        <strong>
                          {formatNumber(analysisResult.advice.take_profit)}
                        </strong>
                      </li>
                      <li>
                        停損防守（-10%）：{" "}
                        <strong>
                          {formatNumber(analysisResult.advice.stop_loss)}
                        </strong>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h3>資金配置試算</h3>
                    <ul className="price-list">
                      <li>
                        最大可買股數：{" "}
                        <strong>
                          {analysisResult.money_management.max_shares} 股
                        </strong>
                      </li>
                      <li>
                        預估買入成本：{" "}
                        <strong>
                          {formatNumber(
                            analysisResult.money_management.total_cost
                          )}{" "}
                          元
                        </strong>
                      </li>
                      <li>
                        若下跌 10% 時預估虧損：{" "}
                        <strong>
                          {formatNumber(
                            analysisResult.money_management.risk_loss_10_percent
                          )}{" "}
                          元
                        </strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 極端行情預警 */}
              <section className="card">
                <h2>極端行情預警（VaR 95%）</h2>
                <p>
                  若未來 60 天發生極端崩跌（95% 信心水準），
                  你的部位可能面臨：
                </p>
                <ul className="price-list">
                  <li>
                    預估最大虧損：{" "}
                    <strong>
                      {formatNumber(
                        analysisResult.risk_analysis.max_loss_amt
                      )}{" "}
                      元（
                      {formatNumber(
                        analysisResult.risk_analysis.max_drawdown_pct
                      )}
                      %）
                    </strong>
                  </li>
                  <li>
                    悲觀目標價：約{" "}
                    <strong>
                      {formatNumber(
                        analysisResult.risk_analysis.pessimistic_price
                      )}{" "}
                      元
                    </strong>
                  </li>
                </ul>
              </section>

              {/* 股價走勢 + 簡單線圖（文字版），附 K 線詳細分析按鈕 */}
              <section className="card">
                <h2>股價走勢與 AI 預測區間</h2>
                <p className="small-text">
                  下方為最近一段期間的收盤價走勢與未來預測資料（僅示意，實際以市場為準）。
                </p>
                <div className="chart-placeholder">
                  {/* 這裡先用文字列出部分資料，未來你可以換成真正的圖表 Library */}
                  <div className="chart-subtitle">歷史價格（節錄）</div>
                  <div className="chart-scroll">
                    {analysisResult.chart_data.history.slice(-30).map((p) => (
                      <div key={p.date} className="chart-point">
                        <span>{p.date}</span>
                        <span>{formatNumber(p.price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="chart-subtitle">AI 預測價格（節錄）</div>
                  <div className="chart-scroll">
                    {analysisResult.chart_data.prediction.slice(0, 20).map((p) => (
                      <div key={p.date} className="chart-point prediction">
                        <span>{p.date}</span>
                        <span>{formatNumber(p.predicted_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className="btn secondary full"
                  type="button"
                  onClick={loadKlineDetail}
                >
                  🔍 查看 K 線詳細分析（需登入）
                </button>
                {klineLoading && <p>載入 K 線資料中...</p>}
                {klineError && <p className="error-text">{klineError}</p>}

                {klineData && (
                  <div className="kline-panel">
                    <h3>
                      {klineData.symbol} K 線摘要（{klineData.interval}）
                    </h3>
                    <p className="small-text">
                      以下為後端整理的 OHLC、技術指標與部分 K 線型態偵測結果（你未來可以用這些資料畫出真正的 K 線 / MACD / RSI 圖）。
                    </p>
                    <div className="kline-subsection">
                      <strong>最近 5 根 K 線：</strong>
                      <ul>
                        {klineData.candles.slice(-5).map((c) => (
                          <li key={c.date}>
                            {c.date} | O:{formatNumber(c.open)} H:
                            {formatNumber(c.high)} L:{formatNumber(c.low)} C:
                            {formatNumber(c.close)} V:
                            {formatNumber(c.volume)}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="kline-subsection">
                      <strong>偵測到的 K 線型態（節錄）：</strong>
                      {klineData.patterns && klineData.patterns.length > 0 ? (
                        <ul>
                          {klineData.patterns.slice(-10).map((p, idx) => (
                            <li key={idx}>
                              {p.date} → {p.pattern}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>目前區間內尚未偵測到明顯型態。</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {/* 模擬資產管理（需要登入，獨立一個卡片） */}
          <section className="card">
            <h2>模擬資產管理（需登入）</h2>
            <button
              className="btn secondary"
              type="button"
              onClick={loadPortfolio}
            >
              重新載入模擬資產
            </button>
            {portfolioLoading && <p>載入中...</p>}
            {portfolioError && <p className="error-text">{portfolioError}</p>}
            {portfolio && (
              <div className="portfolio-panel">
                <p>
                  模擬總資產：{" "}
                  <strong>{formatNumber(portfolio.total_asset)} 元</strong>
                </p>
                <p>
                  總投入成本：{" "}
                  <strong>{formatNumber(portfolio.total_cost)} 元</strong>
                </p>
                <p>
                  未實現損益：{" "}
                  <strong>{formatNumber(portfolio.unrealized_pnl)} 元</strong>
                </p>
                <h3>持倉明細</h3>
                {portfolio.holdings.length === 0 && <p>目前尚未建立任何部位。</p>}
                {portfolio.holdings.length > 0 && (
                  <table className="simple-table">
                    <thead>
                      <tr>
                        <th>股票</th>
                        <th>股數</th>
                        <th>平均成本</th>
                        <th>市值（估）</th>
                        <th>損益（估）</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((h) => (
                        <tr key={h.symbol}>
                          <td>{h.symbol}</td>
                          <td>{h.shares}</td>
                          <td>{formatNumber(h.cost)}</td>
                          <td>{formatNumber(h.market_value)}</td>
                          <td>{formatNumber(h.pnl)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        </div>

        {/* 右側：新聞 + 收藏清單 */}
        <aside className="right-panel">
          <section className="card">
            <h2>全球市場快訊（Real-time）</h2>
            {newsLoading && <p>載入新聞中...</p>}
            {!newsLoading && newsList.length === 0 && <p>目前沒有新聞資料。</p>}
            <ul className="news-list">
              {newsList.map((n, idx) => (
                <li key={idx} className="news-item">
                  <div className="news-tag">{n.source || "新聞"}</div>
                  <div className="news-title">{n.title}</div>
                  <div className="news-time">{n.time}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h2>我的收藏（需登入）</h2>
            {!token && <p>登入後可收藏常看的股票。</p>}
            {token && favorites.length === 0 && <p>尚未收藏任何股票。</p>}
            {token && favorites.length > 0 && (
              <ul className="favorites-list">
                {favorites.map((s) => (
                  <li
                    key={s}
                    className="favorites-item"
                    onClick={() => setSymbol(s)}
                  >
                    ★ {s}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </main>
    </div>
  );
}

export default App;

