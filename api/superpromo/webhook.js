import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

app.post("/api/superpromo/webhook", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === "/start") {
      // Butonlu mesaj
      const keyboard = {
        inline_keyboard: [
          [{ text: "Başla", url: "https://parenatrade.vercel.app/pwa/start" }],
          [{ text: "Kampanyalar", url: "https://parenatrade.vercel.app/pwa/campaigns" }],
          [{ text: "Üyelik", url: "https://parenatrade.vercel.app/pwa/signup" }],
        ],
      };

      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "👋 Merhaba! SuperPromo PWA menüsüne hoş geldin 🚀",
          reply_markup: keyboard,
          parse_mode: "Markdown",
        }),
      });

    } else if (text === "/promos") {
      const { data } = await supabase.from("tlgsp_campaigns").select("title, api_url").eq("active", true);
      if (!data || data.length === 0) {
        await sendMessage(chatId, "Şu anda aktif kampanya bulunamadı ❌");
      } else {
        const promosText = data.map(p => `🎯 *${p.title}*\n🔗 ${p.api_url}`).join("\n\n");
        await sendMessage(chatId, promosText);
      }
    } else {
      await sendMessage(chatId, "Komut bulunamadı. /promos veya /start deneyin 💬");
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SuperPromos bot çalışıyor, port ${PORT}`));
