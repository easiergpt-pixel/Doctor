import express from "express";

const app = express();
const PORT = parseInt(process.env.PORT || "5050", 10);

// Configuration via environment variables
const BOT_TOKEN = process.env.BOT_TOKEN; // required
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || "/api/webhooks/telegram"; // optional override
const SECRET_TOKEN = process.env.SECRET_TOKEN || "my-super-secret"; // should match setWebhook secret_token
const PUBLIC_URL = process.env.PUBLIC_URL; // e.g. https://your-subdomain.ngrok-free.app

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN env var. Set it before starting the server.");
  process.exit(1);
}

app.use(express.json());

// Root + health endpoints
app.get("/", (_req, res) => {
  res.type("text/plain").send(
    `tg-bot running on :${PORT}. POST updates to ${WEBHOOK_PATH}.\nHealth: /health\n`
  );
});
app.get("/health", (_req, res) => res.json({ ok: true }));

// Simple helper to set Telegram webhook (optional)
app.post("/admin/set-webhook", async (_req, res) => {
  try {
    if (!PUBLIC_URL) {
      return res.status(400).json({ message: "Set PUBLIC_URL env var to your public base (e.g., ngrok https URL)." });
    }
    const url = `${PUBLIC_URL}${WEBHOOK_PATH}`;
    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret_token: SECRET_TOKEN }),
    });
    const data = await resp.json();
    res.json({ ok: true, webhook: url, telegram: data });
  } catch (err) {
    console.error("set-webhook error:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Optional GET endpoint (lets you test in a browser)
app.get(WEBHOOK_PATH, (_req, res) => {
  res.json({ status: "ok" });
});

// Webhook endpoint (Telegram will POST updates here)
app.post(WEBHOOK_PATH, async (req, res) => {
  try {
    // Verify Telegram's secret token header
    const headerToken = req.get("X-Telegram-Bot-Api-Secret-Token");
    if (headerToken !== SECRET_TOKEN) {
      return res.sendStatus(401);
    }

    const update = req.body;

    // Respond quickly so Telegram is satisfied
    res.sendStatus(200);

    // Handle a text message (simple echo bot)
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Send message back via Telegram API
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `You said: ${text}`,
        }),
      });
    }
  } catch (err) {
    console.error("Webhook error:", err);
    // We already replied with 200 above
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`tg-bot server running at http://127.0.0.1:${PORT}${WEBHOOK_PATH}`);
});

