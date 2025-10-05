import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(express.json());

// Supabase bağlantısı
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Telegram bot token
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

// Webhook endpoint
app.post("/", async (req, res) => {
  try {
    const message = req.body.message;
    if (!message || !message.text) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === "/start") {
      await sendMessage(chatId, "👋 Merhaba! SuperPromo botuna hoş geldin 🚀");
    } else if (text === "/campaigns") {
      const { data, error } = await supabase
        .from("tlgsp_campaigns")
        .select("title, url")
        .eq("active", true);

      if (error) throw error;

      if (!data || data.length === 0) {
        await sendMessage(chatId, "Şu anda aktif kampanya bulunamadı ❌");
      } else {
        const campaignsText = data.map(p => `🎯 *${p.title}*\n🔗 ${p.url}`).join("\n\n");
        await sendMessage(chatId, campaignsText);
      }
    } else {
      await sendMessage(chatId, "Komut bulunamadı. /campaigns veya /start deneyin 💬");
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
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    }),
  });
}

// Local çalıştırma
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SuperPromos bot çalışıyor, port ${PORT}`);

});
