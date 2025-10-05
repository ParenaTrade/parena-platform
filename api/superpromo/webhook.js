import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(express.json());

// Supabase bağlantısı
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Telegram bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

app.post("/api/superpromo/webhook", async (req, res) => {
  try {
    const message = req.body.message || req.body.callback_query;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat ? message.chat.id : message.message.chat.id;

    // Callback tıklanırsa
    if (req.body.callback_query) {
      const data = req.body.callback_query.data;
      if (data === "kampanyalar") {
        await sendMessage(chatId, "🎯 Demo Kampanyalar:\n1. Kampanya 1\n2. Kampanya 2");
      } else if (data === "uyelik") {
        await sendMessage(chatId, "📝 Üyelik formu: https://example.com/signup");
      } else if (data === "canli_sonuclar") {
        await sendMessage(chatId, "📊 Canlı Sonuçlar: Demo veriler...");
      } else if (data === "istatistikler") {
        await sendMessage(chatId, "📈 İstatistikler: Demo veriler...");
      } else if (data === "bahisler") {
        await sendMessage(chatId, "🎲 Bahis yönlendirmesi: https://example.com/bahis");
      }
      // Callback mesajını onayla
      await answerCallback(message.id);
    } else if (message.text) {
      const text = message.text.trim();
      if (text === "/start") {
        await sendMessage(chatId, "👋 Hoşgeldiniz! SuperPromo botuna başlamak için aşağıdaki butonları kullanabilirsiniz:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Başla", callback_data: "kampanyalar" }],
              [{ text: "Kampanyalar", callback_data: "kampanyalar" }],
              [{ text: "Üyelik", callback_data: "uyelik" }],
              [{ text: "Canlı Sonuçlar", callback_data: "canli_sonuclar" }],
              [{ text: "İstatistikler", callback_data: "istatistikler" }],
              [{ text: "Bahisler", callback_data: "bahisler" }]
            ]
          }
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

async function sendMessage(chatId, text, extra = {}) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      ...extra
    })
  });
}

async function answerCallback(callback_query_id) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id })
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SuperPromos bot çalışıyor, port ${PORT}`));
