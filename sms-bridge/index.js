const express = require("express");
const puppeteer = require("puppeteer");

// ── Config ────────────────────────────────────────────────────────────────────
const ROUTER_URL      = process.env.ROUTER_URL      || "http://192.168.1.1";
const ROUTER_PASSWORD = process.env.ROUTER_PASSWORD || "your-router-password";
const BRIDGE_SECRET   = process.env.BRIDGE_SECRET   || "change-me-secret";
const PORT            = process.env.PORT             || 3001;

// ── State ─────────────────────────────────────────────────────────────────────
let browser  = null;
let page     = null;
let loggedIn = false;

// Recent messages log (kept in memory, last 50)
const recentMessages = [];
function logMessage(to, message, ok, error = null) {
  recentMessages.unshift({ to, message, ok, error, time: new Date().toISOString() });
  if (recentMessages.length > 50) recentMessages.pop();
}

// ── Puppeteer helpers ─────────────────────────────────────────────────────────
async function launchBrowser() {
  console.log("[browser] launching Chromium...");
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
    ],
  });
  page = await browser.newPage();
  await page.setDefaultTimeout(20000);
  console.log("[browser] ready");
}

async function doLogin() {
  console.log("[login] navigating to router...");
  await page.goto(ROUTER_URL, { waitUntil: "networkidle0", timeout: 20000 });

  await page.waitForSelector("#pc-login-password", { timeout: 15000 });
  console.log("[login] login form found");

  // TP-Link uses tpInput jQuery widget — set password via widget API
  await page.evaluate((pwd) => {
    if (window.$ && $("#pc-login-password").tpInput) {
      $("#pc-login-password").tpInput("val", pwd);
    }
  }, ROUTER_PASSWORD);

  // Click via JS to avoid Puppeteer navigation hang
  await page.evaluate(() => { document.getElementById("pc-login-btn").click(); });
  console.log("[login] clicked login button...");

  // Poll for "force other device to log off" dialog
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const clicked = await page.evaluate(() => {
      const el = document.getElementById("alert-container");
      if (el && window.getComputedStyle(el).display !== "none") {
        const btn = document.getElementById("confirm-yes");
        if (btn) { btn.click(); return true; }
      }
      return false;
    });
    if (clicked) {
      console.log("[login] forced previous session to log off");
      break;
    }
  }

  // Fixed wait — covers login + dashboard load
  await new Promise((r) => setTimeout(r, 12000));

  const bodyLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
  if (bodyLen < 400) throw new Error(`Login failed — dashboard not loaded (bodyLen=${bodyLen})`);

  loggedIn = true;
  console.log("[login] success");
}

async function navigateToSmsForm() {
  console.log("[sms] navigating to New Message form...");
  await page.evaluate(() => { $.loadMain("lteSmsNewMsg.htm"); });
  await page.waitForSelector("#toNumber", { timeout: 20000 });
  console.log("[sms] form loaded");
}

async function fillAndSend(to, message) {
  await page.evaluate(() => {
    document.getElementById("toNumber").value = "";
    document.getElementById("inputContent").value = "";
  });

  await page.focus("#toNumber");
  await page.type("#toNumber", to, { delay: 20 });

  await page.focus("#inputContent");
  await page.type("#inputContent", message, { delay: 10 });

  console.log(`[sms] sending to ${to}: "${message}"`);
  await page.click("#send");

  await new Promise((r) => setTimeout(r, 4000));
  console.log("[sms] sent ok");
}

async function sendSMS(to, message) {
  if (!browser) await launchBrowser();
  if (!loggedIn) await doLogin();

  try {
    await navigateToSmsForm();
    await fillAndSend(to, message);
  } catch (err) {
    console.warn("[sms] error, re-logging in:", err.message);
    loggedIn = false;
    await doLogin();
    await navigateToSmsForm();
    await fillAndSend(to, message);
  }
}

// ── Web UI ────────────────────────────────────────────────────────────────────
const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SMS Bridge</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0f1117;
    color: #e2e8f0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  /* ── Login ── */
  #login-screen {
    background: #1a1d27;
    border: 1px solid #2d3148;
    border-radius: 16px;
    padding: 40px 36px;
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .logo { font-size: 2rem; text-align: center; }
  .login-title { font-size: 1.25rem; font-weight: 700; text-align: center; color: #f1f5f9; }
  .login-sub   { font-size: .83rem; color: #64748b; text-align: center; }

  /* ── Dashboard ── */
  #dashboard { width: 100%; max-width: 760px; display: flex; flex-direction: column; gap: 20px; }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }
  .header-title { font-size: 1.2rem; font-weight: 700; color: #f1f5f9; display: flex; align-items: center; gap: 8px; }

  /* ── Cards ── */
  .card {
    background: #1a1d27;
    border: 1px solid #2d3148;
    border-radius: 14px;
    padding: 20px 24px;
  }
  .card-title {
    font-size: .72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #64748b;
    margin-bottom: 14px;
  }

  /* ── Status pill ── */
  .status-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: .82rem;
    font-weight: 600;
  }
  .pill.green { background: #14532d40; color: #4ade80; border: 1px solid #166534; }
  .pill.red   { background: #7f1d1d40; color: #f87171; border: 1px solid #7f1d1d; }
  .pill.grey  { background: #1e293b;   color: #94a3b8; border: 1px solid #334155; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

  /* ── Form ── */
  .form { display: flex; flex-direction: column; gap: 12px; }
  label { font-size: .8rem; color: #94a3b8; display: flex; flex-direction: column; gap: 5px; }
  input, textarea {
    background: #0f1117;
    border: 1.5px solid #2d3148;
    border-radius: 8px;
    padding: 10px 12px;
    color: #e2e8f0;
    font-family: inherit;
    font-size: .9rem;
    transition: border-color .15s;
    width: 100%;
  }
  input:focus, textarea:focus { outline: none; border-color: #6366f1; }
  textarea { resize: vertical; min-height: 80px; }

  /* ── Buttons ── */
  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: .9rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity .15s, transform .1s;
  }
  .btn:hover:not(:disabled) { opacity: .85; transform: translateY(-1px); }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .btn-primary { background: #6366f1; color: #fff; width: 100%; padding: 12px; }
  .btn-sm      { background: #1e293b; color: #94a3b8; border: 1px solid #334155; font-size: .78rem; padding: 6px 12px; }

  /* ── Alert ── */
  .alert {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: .82rem;
    display: none;
  }
  .alert.err     { background: #7f1d1d30; border: 1px solid #7f1d1d; color: #f87171; }
  .alert.success { background: #14532d30; border: 1px solid #166534; color: #4ade80; }

  /* ── Log table ── */
  .log-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: .82rem; }
  th { text-align: left; color: #475569; font-weight: 600; padding: 6px 10px; border-bottom: 1px solid #1e293b; }
  td { padding: 8px 10px; border-bottom: 1px solid #1a1d27; color: #cbd5e1; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .ok-badge  { color: #4ade80; font-weight: 600; }
  .err-badge { color: #f87171; font-weight: 600; }
  .mono { font-family: monospace; font-size: .78rem; color: #64748b; }
  .empty-log { color: #475569; text-align: center; padding: 24px; font-size: .85rem; }
</style>
</head>
<body>

<!-- ── Login ── -->
<div id="login-screen">
  <div class="logo">🌉</div>
  <p class="login-title">SMS Bridge</p>
  <p class="login-sub">Enter the bridge secret to continue</p>
  <label>Secret
    <input id="secret-input" type="password" placeholder="••••••••" autocomplete="current-password" />
  </label>
  <div id="login-alert" class="alert err">Wrong secret</div>
  <button class="btn btn-primary" id="login-btn">Log in</button>
</div>

<!-- ── Dashboard ── -->
<div id="dashboard" style="display:none">
  <header>
    <div class="header-title">🌉 SMS Bridge</div>
    <button class="btn btn-sm" id="logout-btn">Log out</button>
  </header>

  <!-- Status -->
  <div class="card">
    <p class="card-title">Status</p>
    <div class="status-row">
      <span id="router-pill" class="pill grey"><span class="dot"></span> Checking…</span>
      <button class="btn btn-sm" id="refresh-btn">↻ Refresh</button>
    </div>
  </div>

  <!-- Send SMS -->
  <div class="card">
    <p class="card-title">Send SMS</p>
    <div class="form">
      <label>Phone number (international, no +)
        <input id="sms-to" type="tel" placeholder="393331234567" />
      </label>
      <label>Message
        <textarea id="sms-msg" placeholder="Your code is: 1234"></textarea>
      </label>
      <div id="send-alert" class="alert"></div>
      <button class="btn btn-primary" id="send-btn">Send SMS</button>
    </div>
  </div>

  <!-- Log -->
  <div class="card">
    <p class="card-title">Recent messages</p>
    <div class="log-wrap">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>To</th>
            <th>Message</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody id="log-body">
          <tr><td colspan="4" class="empty-log">No messages yet</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<script>
  let secret = localStorage.getItem("bridge_secret") || "";

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function apiFetch(path, opts = {}) {
    return fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-bridge-secret": secret, ...(opts.headers || {}) },
    });
  }

  function showAlert(el, type, msg) {
    el.className = "alert " + type;
    el.textContent = msg;
    el.style.display = "block";
  }
  function hideAlert(el) { el.style.display = "none"; }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  // ── Status ───────────────────────────────────────────────────────────────────
  async function refreshStatus() {
    const pill = document.getElementById("router-pill");
    pill.className = "pill grey";
    pill.innerHTML = '<span class="dot"></span> Checking…';
    try {
      const res = await apiFetch("/api/status");
      if (!res.ok) throw new Error("unauthorized");
      const d = await res.json();
      if (d.loggedIn) {
        pill.className = "pill green";
        pill.innerHTML = '<span class="dot"></span> Router connected';
      } else {
        pill.className = "pill red";
        pill.innerHTML = '<span class="dot"></span> Not logged in';
      }
      renderLog(d.recentMessages);
    } catch {
      pill.className = "pill red";
      pill.innerHTML = '<span class="dot"></span> Unreachable';
    }
  }

  // ── Log ──────────────────────────────────────────────────────────────────────
  function renderLog(messages) {
    const tbody = document.getElementById("log-body");
    if (!messages || messages.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-log">No messages yet</td></tr>';
      return;
    }
    tbody.innerHTML = messages.map(m => \`
      <tr>
        <td class="mono">\${formatTime(m.time)}</td>
        <td>\${m.to}</td>
        <td>\${m.message.length > 60 ? m.message.slice(0, 60) + "…" : m.message}</td>
        <td>\${m.ok
          ? '<span class="ok-badge">✓ sent</span>'
          : \`<span class="err-badge">✗ \${m.error || "error"}</span>\`
        }</td>
      </tr>
    \`).join("");
  }

  // ── Login ─────────────────────────────────────────────────────────────────────
  async function tryLogin() {
    secret = document.getElementById("secret-input").value.trim();
    if (!secret) return;
    const btn = document.getElementById("login-btn");
    btn.disabled = true; btn.textContent = "Checking…";
    try {
      const res = await apiFetch("/api/status");
      if (res.ok) {
        localStorage.setItem("bridge_secret", secret);
        showDashboard();
      } else {
        showAlert(document.getElementById("login-alert"), "err", "Wrong secret");
      }
    } catch {
      showAlert(document.getElementById("login-alert"), "err", "Cannot reach bridge");
    }
    btn.disabled = false; btn.textContent = "Log in";
  }

  function showDashboard() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("dashboard").style.display = "flex";
    document.body.style.alignItems = "flex-start";
    refreshStatus();
  }

  function showLogin() {
    document.getElementById("dashboard").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    document.body.style.alignItems = "center";
  }

  // ── Send SMS ──────────────────────────────────────────────────────────────────
  async function sendSms() {
    const to  = document.getElementById("sms-to").value.trim();
    const msg = document.getElementById("sms-msg").value.trim();
    const alertEl = document.getElementById("send-alert");
    const btn = document.getElementById("send-btn");
    hideAlert(alertEl);
    if (!to || !msg) { showAlert(alertEl, "err", "Fill in both fields"); return; }
    btn.disabled = true; btn.textContent = "Sending…";
    try {
      const res = await apiFetch("/send-sms", { method: "POST", body: JSON.stringify({ to, message: msg }) });
      const d = await res.json();
      if (res.ok) {
        showAlert(alertEl, "success", "SMS sent successfully");
        document.getElementById("sms-to").value = "";
        document.getElementById("sms-msg").value = "";
        setTimeout(refreshStatus, 1000);
      } else {
        showAlert(alertEl, "err", d.error || "Failed");
      }
    } catch {
      showAlert(alertEl, "err", "Network error");
    }
    btn.disabled = false; btn.textContent = "Send SMS";
  }

  // ── Init ──────────────────────────────────────────────────────────────────────
  document.getElementById("login-btn").addEventListener("click", tryLogin);
  document.getElementById("secret-input").addEventListener("keydown", e => e.key === "Enter" && tryLogin());
  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("bridge_secret");
    secret = "";
    showLogin();
  });
  document.getElementById("refresh-btn").addEventListener("click", refreshStatus);
  document.getElementById("send-btn").addEventListener("click", sendSms);

  // Auto-login if secret already stored
  if (secret) {
    document.getElementById("secret-input").value = secret;
    tryLogin();
  }
</script>
</body>
</html>`;

// ── Express server ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Public: serve the UI
app.get("/", (_req, res) => res.send(UI_HTML));

// Auth middleware — applies to all routes below this line
app.use((req, res, next) => {
  if (req.headers["x-bridge-secret"] !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// Status (used by the UI)
app.get("/api/status", (_req, res) => {
  res.json({ ok: true, loggedIn, recentMessages });
});

// Health check
app.get("/health", (_req, res) => res.json({ ok: true, loggedIn }));

// Send SMS
app.post("/send-sms", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "Missing to or message" });
  }
  try {
    await sendSMS(to, message);
    logMessage(to, message, true);
    res.json({ ok: true });
  } catch (err) {
    console.error("[sms] failed:", err.message);
    logMessage(to, message, false, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🌉 SMS Bridge running on http://localhost:${PORT}`);
  console.log(`   Router:  ${ROUTER_URL}`);
  console.log(`   UI:      http://localhost:${PORT}/\n`);

  try {
    await launchBrowser();
    await doLogin();
    console.log("✅ Ready to send SMS\n");
  } catch (err) {
    console.error("❌ Startup login failed:", err.message);
    console.error("   Check ROUTER_PASSWORD and that the router is reachable\n");
  }
});
