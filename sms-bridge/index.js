const express = require("express");
const puppeteer = require("puppeteer");

// ── Config (set these as environment variables or edit here) ──────────────────
const ROUTER_URL      = process.env.ROUTER_URL      || "http://192.168.1.1";
const ROUTER_PASSWORD = process.env.ROUTER_PASSWORD || "your-router-password";
const BRIDGE_SECRET   = process.env.BRIDGE_SECRET   || "change-me-secret";
const PORT            = process.env.PORT             || 3001;

// ── State ─────────────────────────────────────────────────────────────────────
let browser  = null;
let page     = null;
let loggedIn = false;

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

  // Wait for login form
  await page.waitForSelector("#pc-login-password", { timeout: 15000 });
  console.log("[login] login form found");

  // TP-Link uses tpInput jQuery widget — set password via widget API
  await page.evaluate((pwd) => {
    if (window.$ && $("#pc-login-password").tpInput) {
      $("#pc-login-password").tpInput("val", pwd);
    }
  }, ROUTER_PASSWORD);

  // Click the login button via JS to avoid Puppeteer navigation waits
  await page.evaluate(() => { document.getElementById("pc-login-btn").click(); });
  console.log("[login] clicked login button...");

  // Poll for "force other device to log off" dialog (getBusy may take a few seconds)
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const clicked = await page.evaluate(() => {
      const el = document.getElementById("alert-container");
      // Use computed style — offsetParent is null for position:fixed elements
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

  // Wait for dashboard — fixed 12s covers login + dashboard load
  await new Promise((r) => setTimeout(r, 12000));

  const bodyLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
  if (bodyLen < 400) throw new Error(`Login failed — dashboard not loaded (bodyLen=${bodyLen})`);



  loggedIn = true;
  console.log("[login] success");
}

async function navigateToSmsForm() {
  console.log("[sms] navigating to New Message form...");

  // Use the router's own JS to load the SMS compose page
  await page.evaluate(() => { $.loadMain("lteSmsNewMsg.htm"); });

  // Wait for the SMS compose form
  await page.waitForSelector("#toNumber", { timeout: 20000 });
  console.log("[sms] form loaded");
}

async function fillAndSend(to, message) {
  // Clear and fill phone number
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

  // Wait for the send to complete — the page reloads to lteSmsOutbox after success
  await new Promise((r) => setTimeout(r, 4000));
  console.log("[sms] sent ok");
}

async function sendSMS(to, message) {
  if (!browser) await launchBrowser();

  // Re-login if session expired (page navigated away from router)
  if (!loggedIn) {
    await doLogin();
  }

  try {
    await navigateToSmsForm();
    await fillAndSend(to, message);
  } catch (err) {
    // Session may have expired — re-login once and retry
    console.warn("[sms] error, re-logging in:", err.message);
    loggedIn = false;
    await doLogin();
    await navigateToSmsForm();
    await fillAndSend(to, message);
  }
}

// ── Express server ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Auth middleware
app.use((req, res, next) => {
  if (req.headers["x-bridge-secret"] !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// Health check (no auth needed)
app.get("/health", (_req, res) => res.json({ ok: true, loggedIn }));

// Send SMS
app.post("/send-sms", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "Missing to or message" });
  }
  try {
    await sendSMS(to, message);
    res.json({ ok: true });
  } catch (err) {
    console.error("[sms] failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`\n🌉 SMS Bridge running on http://localhost:${PORT}`);
  console.log(`   Router:  ${ROUTER_URL}`);
  console.log(`   Secret:  ${BRIDGE_SECRET}\n`);

  // Warm up: launch browser and login immediately
  try {
    await launchBrowser();
    await doLogin();
    console.log("✅ Ready to send SMS\n");
  } catch (err) {
    console.error("❌ Startup login failed:", err.message);
    console.error("   Check ROUTER_PASSWORD and that the router is reachable\n");
  }
});
