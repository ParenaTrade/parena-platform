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
    const userId = message.from.id;

    if (text === "/start") {
      await sendMessage(chatId, "👋 Merhaba! SuperPromo botuna hoş geldin 🚀");
      return res.status(200).send("OK");
    }

    if (text.startsWith("/promos")) {
      // Kara listede mi kontrol et
      const { data: blacklist } = await supabase
        .from("tlgsp_blacklist")
        .select("*")
        .eq("telegram_user_id", userId);

      if (blacklist.length > 0) {
        return res.status(200).send("Bu kullanıcı kara listede");
      }

      // Aktif kampanyaları çek
      const { data: campaigns } = await supabase
        .from("tlgsp_campaigns")
        .select("id, title, api_url, country, active")
        .eq("active", true);

      // Ülke filtresi ve rule kontrolü (demo: kullanıcı TR gönderdi)
      const userCountry = "TR"; // demo sabit, gerçek senaryoda IP/şifre vs ile alabilirsiniz
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
          // Eğer rule yok veya blocked ise kara listeye ekle
          await supabase.from("tlgsp_blacklist").insert({
            telegram_user_id: userId,
            reason: `Kampanya kural dışı: ${c.title}`,
          });
        }
      }

      if (allowedCampaigns.length === 0) {
        await sendMessage(chatId, "Üzgünüm, ülkenize yönelik aktif kampanya bulunamadı ❌");
      } else {
        const promosText = allowedCampaigns
          .map(p => `🎯 *${p.title}*\n🔗 ${p.api_url}`)
          .join("\n\n");
        await sendMessage(chatId, promosText);
      }

      return res.status(200).send("OK");
    }

    await sendMessage(chatId, "Komut bulunamadı. /promos veya /start deneyin 💬");
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
