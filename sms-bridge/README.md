# SMS Bridge — TP-Link Router SMS Sender

A lightweight HTTP service that sends SMS messages through a **TP-Link 4G router** (tested on MR600) by automating its web interface with Puppeteer. Designed to run on a local Linux VM and be exposed to the internet via Cloudflare Tunnel.

## How it works

```
Your App (Vercel/cloud)
        │
        │ POST /send-sms
        ▼
Cloudflare Tunnel (e.g. sms.yourdomain.com)
        │
        ▼
SMS Bridge (this service, port 3001)
        │  Puppeteer controls headless Chromium
        ▼
TP-Link Router web UI (192.168.1.1)
        │
        ▼
SMS sent via router's 4G SIM
```

The bridge logs into the router once at startup, keeps the browser session alive, and reuses it for every SMS request — so sending is fast (a few seconds).

---

## Requirements

- Linux VM connected to the same network as the TP-Link router
- Docker + Docker Compose
- A Cloudflare Tunnel (free) to expose port 3001 publicly
- TP-Link 4G router with a SIM card that can send SMS

---

## Quick start

### 1. Clone the repo

```bash
git clone https://github.com/SilvioElezi/sms-bridge.git
cd sms-bridge
```

### 2. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in your values:

```env
ROUTER_URL=http://192.168.1.1       # your router's local IP
ROUTER_PASSWORD=your-router-password
BRIDGE_SECRET=pick-a-strong-secret  # shared secret for request auth
PORT=3001
```

### 3. Start the service

```bash
docker compose up -d
```

The first start takes a minute — Docker installs Chromium and the bridge logs into the router. Check logs with:

```bash
docker compose logs -f
```

You should see:

```
✅ Ready to send SMS
```

---

## Expose it with Cloudflare Tunnel

Install [cloudflared](https://github.com/cloudflare/cloudflared/releases/latest) on the same machine and run:

```bash
cloudflared tunnel --url http://localhost:3001
```

Or set up a named tunnel pointing to `http://localhost:3001` in your Cloudflare dashboard with a custom domain (e.g. `sms.yourdomain.com`).

---

## API

All requests require the header:

```
x-bridge-secret: your-BRIDGE_SECRET-value
```

### `POST /send-sms`

Send an SMS.

**Request body:**
```json
{
  "to": "393331234567",
  "message": "Your confirmation code is: 1234"
}
```

**Response:**
```json
{ "ok": true }
```

**Error:**
```json
{ "error": "description" }
```

### `GET /health`

Check if the bridge is running and logged into the router.

```
GET /health
x-bridge-secret: your-secret
```

```json
{ "ok": true, "loggedIn": true }
```

---

## Calling from your app (Node.js / Next.js example)

```js
async function sendSms(phone, message) {
  const res = await fetch(`${process.env.SMS_BRIDGE_URL}/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-secret": process.env.BRIDGE_SECRET,
    },
    body: JSON.stringify({ to: phone, message }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
}
```

Set these environment variables in your app:

| Variable | Example |
|---|---|
| `SMS_BRIDGE_URL` | `https://sms.yourdomain.com` |
| `BRIDGE_SECRET` | same value as in `.env` |

---

## Notes

- **One session at a time** — the router only allows one logged-in device. If you log into the router manually while the bridge is running, the bridge will detect the conflict and force-logout the other session automatically on the next SMS request.
- **Session recovery** — if the router reboots or the session expires, the bridge re-logs in automatically before retrying.
- **Phone number format** — use international format without `+` (e.g. `393331234567` for `+39 333 123 4567`).
- **Not for high volume** — each SMS takes 4–6 seconds as it drives the router's UI. Fine for OTP/transactional use, not for bulk sending.

---

## Tested with

- TP-Link Archer MR600 (AC1200 4G LTE)
- Puppeteer 21 / Chromium on Debian bookworm
- Cloudflare Tunnel (free tier)
