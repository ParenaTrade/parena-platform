import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("Webhook aktif 🚀");

  try {
    const message = req.body.message;
    if (!message || !message.text) return res.status(200).send("Mesaj yok");

    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === "/start") {
      await sendMessage(chatId, "👋 Merhaba! SuperPromo botuna hoş geldin 🚀");
    } else if (text === "/promos") {
      const { data, error } = await supabase
        .from("tlgsp_campaigns")
        .select("title, api_url")
        .eq("active", true);

      if (error) throw error;

      if (!data || data.length === 0) {
        await sendMessage(chatId, "Şu anda aktif kampanya bulunamadı ❌");
      } else {
        const promosText = data
          .map(p => `🎯 *${p.title}*\n🔗 ${p.api_url}`)
          .join("\n\n");
        await sendMessage(chatId, promosText);
      }
    } else {
      await sendMessage(chatId, "Komut bulunamadı. /promos veya /start deneyin 💬");
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Webhook error");
  }
}

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
