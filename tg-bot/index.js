import express from "express";

const app = express();
const PORT = 5050;

// ⚠️ Replace if you later revoke/regenerate your token
const BOT_TOKEN = "8025887309:AAElnWf_wnHyHIMee5IWTSPCY_jW_UWHPSA";

// Telegram will call this exact path
const WEBHOOK_PATH = "/api/webhooks/telegram";

// Choose any secret string; must match when you set the webhook
const SECRET_TOKEN = "my-super-secret";

// Parse JSON
app.use(express.json());

// ---------- Browser homepage (so / works) ----------
app.get("/", (req, res) => {
  res.send(
    `<h1>My app is working ✅</h1>
     <p>Ping JSON: <a href="${WEBHOOK_PATH}">${WEBHOOK_PATH}</a></p>`
  );
});

// ---------- Webhook ping (GET) ----------
app.get(WEBHOOK_PATH, (req, res) => {
  res.json({ status: "ok" });
});

// ---------- Telegram webhook (POST) ----------
app.post(WEBHOOK_PATH, async (req, res) => {
  try {
    // Verify Telegram's secret token (optional but recommended)
    const headerToken = req.get("X-Telegram-Bot-Api-Secret-Token");
    if (headerToken !== SECRET_TOKEN) {
      return res.sendStatus(401);
    }

    const update = req.body;

    // Always acknowledge fast
    res.sendStatus(200);

    // Simple echo for text messages
    if (update?.message?.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      // Node 18+ has global fetch; if older, install node-fetch and import it
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: `You said: ${text}` }),
      });
    }
  } catch (err) {
    console.error("Webhook error:", err);
    // (We already replied 200; just log errors.)
  }
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://127.0.0.1:${PORT}/`);
  console.log(`   Webhook GET ping: http://127.0.0.1:${PORT}${WEBHOOK_PATH}`);
});
