import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// Supabase bağlantısı
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Telegram Bot
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("Webhook aktif 🚀");

  try {
    const message = req.body.message;
    if (!message || !message.text) return res.status(200).send("Mesaj yok");

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from.id;

    // Kara listede mi kontrol et
    const { data: blacklist } = await supabase
      .from("tlgsp_blacklist")
      .select("*")
      .eq("telegram_user_id", userId);

    if (blacklist.length > 0) {
      await sendMessage(chatId, "⚠️ Bu kullanıcı kara listede");
      return res.status(200).send("Kara listede");
    }

    // Komut tablosundan çek
    const { data: command } = await supabase
      .from("tlgsp_commands")
      .select("*")
      .eq("command", text)
      .eq("active", true)
      .limit(1)
      .single();

    if (!command) {
      await sendMessage(chatId, "Komut bulunamadı. /promos, /start veya /deneme deneyin 💬");
      return res.status(200).send("Komut yok");
    }

    // Komuta bağlı görevleri çek
    const { data: tasks } = await supabase
      .from("tlgsp_tasks")
      .select("*")
      .eq("command_id", command.id)
      .eq("active", true);

    // Debug log
    console.log("Gelen mesaj:", message);
    console.log("Komut:", command);
    console.log("Görevler:", tasks);

    for (let task of tasks) {
      if (task.task_type === "send_message") {
        await sendMessage(chatId, task.task_payload.text);
      } else if (task.task_type === "fetch_campaigns") {
        // Kampanyaları çek ve filtrele (rule ve ülke demo)
        const userCountry = task.task_payload.country || "TR";
        const { data: campaigns } = await supabase
          .from("tlgsp_campaigns")
          .select("id, title, api_url, country, active")
          .eq("active", true);

        const allowedCampaigns = [];
        for (let c of campaigns) {
          const { data: rules } = await supabase
            .from("tlgsp_rules")
            .select("*")
            .eq("campaign_id", c.id)
            .eq("country", userCountry);

          if (rules.length > 0 && rules[0].status === "allowed") {
            allowedCampaigns.push(c);
          } else {
            // Rule dışı → kara liste
            await supabase.from("tlgsp_blacklist").insert({
              telegram_user_id: userId,
              reason: `Kampanya kural dışı: ${c.title}`,
            });
          }
        }

        if (allowedCampaigns.length === 0) {
          await sendMessage(chatId, "❌ Üzgünüm, ülkenize yönelik aktif kampanya bulunamadı");
        } else {
          const promosText = allowedCampaigns
            .map(p => `🎯 *${p.title}*\n🔗 ${p.api_url}`)
            .join("\n\n");
          await sendMessage(chatId, promosText);
        }
      }
    }

    res.status(200).send("OK");

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Webhook error");
  }
}

// Telegram mesaj gönderme
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
