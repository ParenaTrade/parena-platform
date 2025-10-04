import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    })
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  try {
    const update = req.body;

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;

      if (text === "/start") {
        await sendMessage(chatId, "👋 Merhaba! SuperPromo botuna hoş geldin 🚀");
      }

      if (text === "/promos") {
        const { data, error } = await supabase
          .from("promos")
          .select("title, url")
          .eq("active", true);

        if (error) {
          await sendMessage(chatId, "⚠️ Promosyonları çekerken hata oluştu.");
        } else if (data.length === 0) {
          await sendMessage(chatId, "Şu anda aktif promosyon yok.");
        } else {
          for (let promo of data) {
            await sendMessage(chatId, `🔥 *${promo.title}*\n👉 [Hemen Katıl](${promo.url})`);
          }
        }
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Internal Server Error");
  }
}
