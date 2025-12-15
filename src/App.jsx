// ===============================
// 檔案：stock-frontend/src/App.jsx
// 目的：強化註冊/登入 + 修正上線 API 問題 + 冷啟動提示
// ===============================

import React, { useEffect, useMemo, useState } from "react";

// =========================
// API Base（本機不設 env → 走 Vite proxy；上線 Vercel 設 VITE_API_BASE → 直打 Render）
// =========================
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
function apiUrl(path) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}${path}`;
}

// =========================
// 基本工具
// =========================
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Render 冷啟動：先打一個輕量 API 喚醒後端
async function warmUpBackend() {
  try {
    await fetchWithTimeout(apiUrl("/api/news"), { method: "GET" }, 8000);
  } catch {
    // 不阻斷流程：只是盡量喚醒
  }
}

// =========================
// 註冊 / 登入基本規則（你要的）
// =========================
// 帳號：4–20，只允許英文/數字/底線
const USERNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;

// 密碼：至少 8 碼，且必須包含「英文 + 數字」
function passwordRuleCheck(pw) {
  const minLen = pw.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  return {
    ok: minLen && hasLetter && hasNumber,
    minLen,
    hasLetter,
    hasNumber,
    hasUpper,
  };
}

export default function App() {
  // ===== Auth 狀態 =====
  const [token, setToken] = useState(null);
  const [username, setUsername] = useState("");

  // 登入表單
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 註冊表單
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(""); // 共用錯誤訊息（登入/註冊）
  const [authInfo, setAuthInfo] = useState(""); // 共用提示訊息

  // ===== 輸入區 =====
  const [symbol, setSymbol] = useState("2330.TW");
  const [principal, setPrincipal] = useState(100000);
  const [strategy, setStrategy] = useState("none");
  const [duration, setDuration] = useState("mid");
  const [isFavorite, setIsFavorite] = useState(false);

  // ===== 分析結果 =====
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [roiTab, setRoiTab] = useState("mid");

  // ===== 新聞 =====
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // ===== 收藏 =====
  const [favorites, setFavorites] = useState([]);

  // ===== 模擬資產 =====
  const [portfolio, setPortfolio] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState("");

  // ===== K 線詳細分析（先留資料，後端 endpoint 我們下一步再補齊）=====
  const [klineData, setKlineData] = useState(null);
  const [klineLoading, setKlineLoading] = useState(false);
  const [klineError, setKlineError] = useState("");

  // =========================
  // 初始化：讀 localStorage token
  // =========================
  useEffect(() => {
    const savedToken = localStorage.getItem("stock_token");
    const savedUser = localStorage.getItem("stock_username");
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) setUsername(savedUser);
    }
  }, []);

  // =========================
  // 取得新聞（喚醒後端 + 顯示）
  // =========================
  useEffect(() => {
    async function fetchNews() {
      try {
        setNewsLoading(true);
        const res = await fetchWithTimeout(apiUrl("/api/news"), {}, 15000);
        if (!res.ok) throw new Error("無法取得市場新聞");
        const data = await res.json();
        setNewsList(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setNewsLoading(false);
      }
    }
    fetchNews();
  }, []);

  // =========================
  // 表單驗證（你要求的基本規則）
  // =========================
  const loginUsernameValid = useMemo(() => USERNAME_REGEX.test(loginUsername.trim()), [loginUsername]);
  const loginPasswordCheck = useMemo(() => passwordRuleCheck(loginPassword), [loginPassword]);

  const registerUsernameValid = useMemo(() => USERNAME_REGEX.test(registerUsername.trim()), [registerUsername]);
  const registerPasswordCheck = useMemo(() => passwordRuleCheck(registerPassword), [registerPassword]);

  // =========================
  // 登入 / 登出 / 註冊（強化版）
  // =========================
  async function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    setAuthInfo("");
    setAuthLoading(true);

    const u = loginUsername.trim();
    const p = loginPassword;

    // 前端先擋掉格式不對
    if (!USERNAME_REGEX.test(u)) {
      setAuthError("登入失敗：帳號格式不正確（4–20 碼，僅英文/數字/底線）");
      setAuthLoading(false);
      return;
    }
    const pwCheck = passwordRuleCheck(p);
    if (!pwCheck.ok) {
      setAuthError("登入失敗：密碼格式不符合要求（至少 8 碼，且需包含英文 + 數字）");
      setAuthLoading(false);
      return;
    }

    try {
      // Render 冷啟動先喚醒
      await warmUpBackend();

      const body = new URLSearchParams();
      body.append("username", u);
      body.append("password", p);

      const res = await fetchWithTimeout(
        apiUrl("/token"),
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        },
        20000
      );

      if (!res.ok) {
        if (res.status === 401) throw new Error("登入失敗：帳號或密碼錯誤");
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `登入失敗（HTTP ${res.status}）`);
      }

      const data = await res.json();
      setToken(data.access_token);
      setUsername(u);

      localStorage.setItem("stock_token", data.access_token);
      localStorage.setItem("stock_username", u);

      setAuthInfo("✅ 登入成功！");
      setLoginPassword("");
    } catch (err) {
      const msg = err?.name === "AbortError"
        ? "登入逾時：後端可能在冷啟動，請稍後再試"
        : err?.message || "登入發生錯誤";

      // Vercel 常見：Failed to fetch（CORS/後端掛掉/網路）
      if (String(msg).includes("Failed to fetch")) {
        setAuthError("登入失敗：無法連到後端（可能後端睡著、網路或 CORS 問題）");
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setUsername("");
    setFavorites([]);
    setIsFavorite(false);
    setPortfolio(null);
    setKlineData(null);
    localStorage.removeItem("stock_token");
    localStorage.removeItem("stock_username");
    setAuthInfo("你已登出");
  }

  async function handleRegister(e) {
    e.preventDefault();
    setAuthError("");
    setAuthInfo("");
    setAuthLoading(true);

    const u = registerUsername.trim();
    const p = registerPassword;

    // 前端驗證
    if (!USERNAME_REGEX.test(u)) {
      setAuthError("註冊失敗：帳號需 4–20 碼，且僅能包含英文、數字、底線（_）");
      setAuthLoading(false);
      return;
    }
    if (!registerPasswordCheck.ok) {
      setAuthError("註冊失敗：密碼至少 8 碼，且必須同時包含英文 + 數字");
      setAuthLoading(false);
      return;
    }

    try {
      await warmUpBackend();

      // 1) 先註冊
      const res = await fetchWithTimeout(
        apiUrl("/register"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u, password: p }),
        },
        20000
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `註冊失敗（HTTP ${res.status}）`);
      }

      // 2) 註冊成功後自動登入
      setAuthInfo("✅ 註冊成功，正在自動登入...");

      const body = new URLSearchParams();
      body.append("username", u);
      body.append("password", p);

      const loginRes = await fetchWithTimeout(
        apiUrl("/token"),
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        },
        20000
      );

      if (!loginRes.ok) {
        setAuthInfo("✅ 註冊成功！請用新帳號登入");
        setLoginUsername(u);
        return;
      }

      const loginData = await loginRes.json();
      setToken(loginData.access_token);
      setUsername(u);

      localStorage.setItem("stock_token", loginData.access_token);
      localStorage.setItem("stock_username", u);

      setAuthInfo("✅ 註冊並登入成功！");
      setRegisterPassword("");
      setLoginPassword("");
    } catch (err) {
      const msg = err?.name === "AbortError"
        ? "註冊逾時：後端可能在冷啟動，請稍後再試"
        : err?.message || "註冊發生錯誤";

      if (String(msg).includes("Failed to fetch")) {
        setAuthError("註冊失敗：無法連到後端（可能後端睡著、網路或 CORS 問題）");
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthLoading(false);
    }
  }

  // =========================
  // 分析（修 API + 冷啟動提示 + 更清楚錯誤訊息）
  // =========================
  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisResult(null);

    const s = symbol.trim();
    if (!s) {
      setAnalysisError("請先輸入股票代碼或名稱");
      setAnalyzing(false);
      return;
    }

    let durationLabel = "中期(60日)";
    if (duration === "day") durationLabel = "當沖(1日)";
    else if (duration === "short") durationLabel = "短期(5日)";
    else if (duration === "long") durationLabel = "長期(1年)";

    try {
      await warmUpBackend();

      const res = await fetchWithTimeout(
        apiUrl("/api/analyze"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: s,
            principal: Number(principal),
            strategy,
            duration: durationLabel,
          }),
        },
        25000
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `分析失敗（HTTP ${res.status}）`);
      }

      const data = await res.json();
      setAnalysisResult(data);

      if (duration === "day") setRoiTab("day");
      else if (duration === "short") setRoiTab("short");
      else if (duration === "mid") setRoiTab("mid");
      else setRoiTab("long");
    } catch (err) {
      if (err?.name === "AbortError") {
        setAnalysisError("分析逾時：後端可能在冷啟動（Render 常見），請稍後再按一次分析");
      } else if (String(err?.message || "").includes("Failed to fetch")) {
        setAnalysisError("分析失敗：無法連到後端（可能後端睡著、網路或 CORS 問題）");
      } else {
        setAnalysisError(err?.message || "分析過程發生錯誤");
      }
    } finally {
      setAnalyzing(false);
    }
  }

  // =========================
  // 收藏（先保留 UI；真正 API 我們下一步改後端 main.py 補齊）
  // =========================
  async function toggleFavorite() {
    if (!token) {
      alert("請先登入後才能收藏股票");
      return;
    }
    alert("收藏功能需要後端加入 /api/favorites 相關 API，我們下一步會在 stock-backend/main.py 補上。");
  }

  // =========================
  // 模擬資產（已存在後端 /api/portfolio）
  // =========================
  async function loadPortfolio() {
    if (!token) {
      alert("請先登入，才能查看模擬資產");
      return;
    }
    setPortfolioLoading(true);
    setPortfolioError("");
    try {
      const res = await fetchWithTimeout(
        apiUrl("/api/portfolio"),
        { headers: { Authorization: `Bearer ${token}` } },
        20000
      );
      if (!res.ok) {
        if (res.status === 401) throw new Error("尚未登入或登入已過期，請重新登入");
        throw new Error("無法取得模擬資產");
      }
      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      setPortfolioError(err?.message || "取得模擬資產失敗");
    } finally {
      setPortfolioLoading(false);
    }
  }

  // =========================
  // K 線詳細分析（先保留 UI；下一步後端補 /api/kline-detail）
  // =========================
  async function loadKlineDetail() {
    if (!token) {
      alert("請先登入，才能查看 K 線詳細分析");
      return;
    }
    setKlineLoading(true);
    setKlineError("");
    setKlineData(null);
    try {
      // 後端 아직沒做，先提示
      throw new Error("K 線詳細分析需要後端提供 /api/kline-detail，我們下一步會在 stock-backend/main.py 加上。");
    } catch (err) {
      setKlineError(err?.message || "取得 K 線資料失敗");
    } finally {
      setKlineLoading(false);
    }
  }

  // =========================
  // UI：提示文字（你要「明確知道有沒有登入」）
  // =========================
  const loginHint = useMemo(() => {
    if (!loginUsername) return "帳號規則：4–20 碼，只允許英文/數字/底線";
    return loginUsernameValid ? "✅ 帳號格式正確" : "❌ 帳號格式錯誤（僅英文/數字/底線，4–20 碼）";
  }, [loginUsername, loginUsernameValid]);

  const loginPwHint = useMemo(() => {
    if (!loginPassword) return "密碼規則：至少 8 碼，需包含英文 + 數字";
    return loginPasswordCheck.ok
      ? `✅ 密碼格式 OK${loginPasswordCheck.hasUpper ? "" : "（建議加入 1 個大寫更安全）"}`
      : "❌ 密碼格式不符合（至少 8 碼，需包含英文 + 數字）";
  }, [loginPassword, loginPasswordCheck]);

  const regHint = useMemo(() => {
    if (!registerUsername) return "帳號規則：4–20 碼，只允許英文/數字/底線";
    return registerUsernameValid ? "✅ 帳號格式正確" : "❌ 帳號格式錯誤（僅英文/數字/底線，4–20 碼）";
  }, [registerUsername, registerUsernameValid]);

  const regPwHint = useMemo(() => {
    if (!registerPassword) return "密碼規則：至少 8 碼，需包含英文 + 數字";
    return registerPasswordCheck.ok
      ? `✅ 密碼格式 OK${registerPasswordCheck.hasUpper ? "" : "（建議加入 1 個大寫更安全）"}`
      : "❌ 密碼格式不符合（至少 8 碼，需包含英文 + 數字）";
  }, [registerPassword, registerPasswordCheck]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans TC', Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, background: "#f5f7ff" }}>
        <div style={{ fontSize: 22, fontWeight: 800 }}>📈 AI 投資戰情室</div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {token ? (
            <>
              <div style={{ fontWeight: 700 }}>已登入：{username}</div>
              <button onClick={handleLogout} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}>
                登出
              </button>
            </>
          ) : (
            <form onSubmit={handleLogin} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="帳號"
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd", minWidth: 140 }}
              />
              <input
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="密碼"
                type="password"
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd", minWidth: 140 }}
              />
              <button
                type="submit"
                disabled={authLoading}
                style={{ padding: "10px 14px", borderRadius: 10, border: "0", background: "#2f5bff", color: "white", fontWeight: 700, cursor: "pointer" }}
              >
                {authLoading ? "登入中..." : "登入"}
              </button>
              <div style={{ fontSize: 12, color: loginUsernameValid ? "#15803d" : "#b42318" }}>{loginHint}</div>
              <div style={{ fontSize: 12, color: loginPasswordCheck.ok ? "#15803d" : "#b42318" }}>{loginPwHint}</div>
            </form>
          )}
        </div>
      </div>

      {!token && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#ffffff", border: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>沒有帳號？快速註冊（註冊成功後會自動登入）</div>

          <form onSubmit={handleRegister} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              placeholder="新帳號（4–20，英文/數字/_）"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd", minWidth: 220 }}
            />
            <input
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              placeholder="新密碼（至少8碼，英文+數字）"
              type="password"
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd", minWidth: 260 }}
            />
            <button
              type="submit"
              disabled={authLoading}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", fontWeight: 800 }}
            >
              {authLoading ? "送出中..." : "註冊"}
            </button>

            <div style={{ width: "100%" }} />
            <div style={{ fontSize: 12, color: registerUsernameValid ? "#15803d" : "#b42318" }}>{regHint}</div>
            <div style={{ fontSize: 12, color: registerPasswordCheck.ok ? "#15803d" : "#b42318" }}>{regPwHint}</div>
          </form>

          {authError && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#fff1f2", color: "#b42318", fontWeight: 700 }}>
              {authError}
            </div>
          )}
          {authInfo && (
            <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: "#ecfdf3", color: "#15803d", fontWeight: 700 }}>
              {authInfo}
            </div>
          )}
        </div>
      )}

      {/* 輸入區 */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 10 }}>輸入參數</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>股票代碼或名稱</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="如 2330.TW 或 AAPL"
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd" }}
                />
                <button
                  onClick={toggleFavorite}
                  style={{ width: 52, borderRadius: 10, border: "1px solid #d0d5dd", background: "#fff", cursor: "pointer", fontSize: 18 }}
                  title={token ? "收藏 / 取消收藏" : "需登入才能收藏"}
                >
                  {isFavorite ? "★" : "☆"}
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>本金金額（TWD）</div>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                min={0}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd" }}
              />
            </div>

            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>交易策略</div>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd", background: "#fff" }}
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

            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>預計持有時間</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  ["day", "當沖（1 日）"],
                  ["short", "短期（5 日）"],
                  ["mid", "中期（60 日）"],
                  ["long", "長期（1 年）"],
                ].map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setDuration(k)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 10,
                      border: duration === k ? "2px solid #2f5bff" : "1px solid #d0d5dd",
                      background: duration === k ? "#eef2ff" : "#fff",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              style={{
                marginTop: 6,
                padding: "12px 14px",
                borderRadius: 12,
                border: "0",
                background: "#2f5bff",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {analyzing ? "分析中..." : "⚡ 開始分析"}
            </button>

            {analysisError && (
              <div style={{ padding: 10, borderRadius: 10, background: "#fff1f2", color: "#b42318", fontWeight: 800 }}>
                {analysisError}
              </div>
            )}
          </div>
        </div>

        {/* 分析結果（保留現有資料結構） */}
        {analysisResult && (
          <div style={{ padding: 14, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>分析結果</div>
            <div style={{ marginTop: 8 }}>
              股票：<b>{analysisResult.symbol}</b>｜現價：<b>{formatNumber(analysisResult.price)}</b>｜
              AI 評分：<b>{analysisResult.ai_score}</b>｜
              傾向：<b>{analysisResult.ai_sentiment}</b>
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {analysisResult.score_breakdown && (
                <>
                  <div style={{ padding: 10, borderRadius: 10, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    技術面<br /><b>{analysisResult.score_breakdown.technical}</b>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    基本面<br /><b>{analysisResult.score_breakdown.fundamental}</b>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    籌碼面<br /><b>{analysisResult.score_breakdown.chip}</b>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: "#f8fafc", border: "1px solid #e5e7eb" }}>
                    消息面<br /><b>{analysisResult.score_breakdown.news}</b>
                  </div>
                </>
              )}
            </div>

            <div style={{ marginTop: 12, fontWeight: 900 }}>模擬資產管理（需登入）</div>
            <button
              onClick={loadPortfolio}
              style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd", background: "#fff", cursor: "pointer", fontWeight: 900 }}
            >
              重新載入模擬資產
            </button>
            {portfolioLoading && <div style={{ marginTop: 8 }}>載入中...</div>}
            {portfolioError && <div style={{ marginTop: 8, color: "#b42318", fontWeight: 800 }}>{portfolioError}</div>}
            {portfolio && (
              <div style={{ marginTop: 8 }}>
                <div>模擬總資產：<b>{formatNumber(portfolio.total_asset)}</b></div>
                <div>總投入成本：<b>{formatNumber(portfolio.total_cost)}</b></div>
                <div>未實現損益：<b>{formatNumber(portfolio.unrealized_pnl)}</b></div>
              </div>
            )}

            <div style={{ marginTop: 12, fontWeight: 900 }}>K 線詳細分析（需登入）</div>
            <button
              onClick={loadKlineDetail}
              style={{ marginTop: 8, padding: "10px 12px", borderRadius: 10, border: "1px solid #d0d5dd", background: "#fff", cursor: "pointer", fontWeight: 900 }}
            >
              查看 K 線詳細分析
            </button>
            {klineLoading && <div style={{ marginTop: 8 }}>載入中...</div>}
            {klineError && <div style={{ marginTop: 8, color: "#b42318", fontWeight: 800 }}>{klineError}</div>}
            {klineData && <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{JSON.stringify(klineData, null, 2)}</pre>}
          </div>
        )}

        {/* 新聞 */}
        <div style={{ padding: 14, borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>全球市場快訊（Real-time）</div>
          {newsLoading && <div style={{ marginTop: 8 }}>載入新聞中...</div>}
          {!newsLoading && newsList.length === 0 && <div style={{ marginTop: 8 }}>目前沒有新聞資料。</div>}
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {newsList.map((n, idx) => (
              <div key={idx} style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
                <div style={{ fontWeight: 900 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: "#475467" }}>
                  {n.source || "新聞"}｜{n.time || ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* API Base 顯示（除錯用，使用者看不到也可留著） */}
        <div style={{ fontSize: 12, color: "#667085", textAlign: "center" }}>
          API_BASE：{API_BASE ? API_BASE : "(本機模式：使用 Vite Proxy)"}
        </div>
      </div>
    </div>
  );
}
