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

    // Kullanıcı ülke demo (gerçek sistemde kullanıcıdan alınacak)
    const userCountry = 'GE'; // TR blocked, GE active

    // Kurallar kontrolü
    const { data: rule } = await supabase
      .from("tlgsp_rules")
      .select("*")
      .eq("country_code", userCountry)
      .single();

    // Ülke yasaklıysa
    if (!rule || rule.status === "blocked") {
      await sendMessage(chatId, `❌ Üzgünüm, ülkenize yönelik kampanya bulunamadı`);
      if (req.body.callback_query) await answerCallback(req.body.callback_query.id);
      return res.sendStatus(200);
    }

    // Callback tıklamaları
    if (req.body.callback_query) {
      const data = req.body.callback_query.data;
      if (data === "kampanyalar") {
        await sendMessage(chatId, "🎯 Demo Kampanyalar:\n1. Kampanya 1\n2. Kampanya 2");
      } else if (data === "uyelik") {
        await sendMessage(chatId, "📝 Üyelik formu: https://parenatrade.vercel.app/pwa/signup");
      } else if (data === "canli_sonuclar") {
        await sendMessage(chatId, "📊 Canlı Sonuçlar: Demo veriler...");
      } else if (data === "istatistikler") {
        await sendMessage(chatId, "📈 İstatistikler: Demo veriler...");
      } else if (data === "bahisler") {
        await sendMessage(chatId, "🎲 Bahis yönlendirmesi: https://parenatrade.vercel.app/pwa/bahis");
      }
      await answerCallback(req.body.callback_query.id);
    }

    // /start veya text komutları
    else if (message.text) {
      const text = message.text.trim();
      if (text === "/start") {
        await sendMessage(chatId, "👋 Hoşgeldiniz! Butonları kullanabilirsiniz:", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Başla", callback_data: "kampanyalar" }],
              [{ text: "Kampanyalar", callback_data: "kampanyalar" }],
              [{ text: "Üyelik", callback_data: "uyelik" }],
              [{ text: "Canlı Sonuçlar", callback_data: "canli_sonuclar" }],
              [{ text: "İstatistikler", callback_data: "istatistikler" }],
              [{ text: "Bahisler", callback_data: "bahisler" }],
              [{ text: "Online PWA", url: "https://parenatrade.vercel.app/pwa/start" }],
              [{ text: "Üyelik PWA", url: "https://parenatrade.vercel.app/pwa/signup" }],
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

// Mesaj gönderme fonksiyonu
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

// Callback yanıt fonksiyonu
async function answerCallback(callback_query_id) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id })
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SuperPromos bot çalışıyor, port ${PORT}`));
