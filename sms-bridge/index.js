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
  await page.goto(ROUTER_URL, { waitUntil: "domcontentloaded", timeout: 15000 });

  // Wait for password input — TP-Link MR600 has only a password field on login
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.evaluate(() => {
    const el = document.querySelector('input[type="password"]');
    if (el) el.value = "";
  });
  await page.type('input[type="password"]', ROUTER_PASSWORD, { delay: 30 });

  // Click the login button — try multiple selectors
  const loginBtn =
    (await page.$('#pc-login-btn')) ||
    (await page.$('button[id*="login"]')) ||
    (await page.$('button[id*="Login"]')) ||
    (await page.$('.login-btn')) ||
    (await page.$('button[type="button"]'));

  if (!loginBtn) throw new Error("Login button not found");
  await loginBtn.click();

  // Wait for the dashboard to load (main nav or known element)
  await page.waitForFunction(
    () => document.body.innerText.length > 500,
    { timeout: 12000 }
  );

  // Small pause for SPA to settle
  await new Promise((r) => setTimeout(r, 2000));
  loggedIn = true;
  console.log("[login] success");
}

async function navigateToSmsForm() {
  console.log("[sms] navigating to New Message form...");

  // Use the router's own JS to load the SMS compose page
  const loaded = await page.evaluate(() => {
    if (window.$ && typeof $.loadMain === "function") {
      $.loadMain("lteSmsNewMsg.htm");
      return true;
    }
    return false;
  });

  if (!loaded) {
    // Fallback: try clicking through the menu
    console.log("[sms] $.loadMain not available, trying menu clicks...");

    // Try Advanced tab
    const advTab = await page.$('a[id*="advanced"], li[id*="advanced"], [class*="advanced"]');
    if (advTab) await advTab.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Try SMS menu item
    const smsItem = await page.$('[href*="sms"], [id*="sms"], [class*="sms"]');
    if (smsItem) await smsItem.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Try New Message button
    const newMsg = await page.$('[id*="newMsg"], [id*="new-msg"], button');
    if (newMsg) await newMsg.click();
  }

  // Wait for the SMS form to appear
  await page.waitForSelector("#toNumber", { timeout: 15000 });
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
